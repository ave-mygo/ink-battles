"use server";
import type { DatabaseAnalysisRecord } from "@/types/database/analysis_requests";
import crypto from "crypto-js";
import OpenAI from "openai";
import { getConfig } from "@/config";
import { db_name, db_table } from "@/lib/constants";
import { db_find, db_insert, ensureTTLIndex } from "@/lib/db";
import { parseModelOutput } from "@/lib/json-parser";
import { generateSessionId } from "@/utils/auth/sessions";
import "server-only";

const AppConfig = getConfig();

// 预编译正则表达式，避免每次调用时重新编译
const NORMALIZE_TEXT_REGEX = /[\s\p{P}\p{S}]/gu;
const JSON_MATCH_REGEX = /data:\s*(\{[\s\S]*\})/;
const DATA_PREFIX_REGEX = /^data:\s*/;

/**
 * 构建系统提示词
 * @param enableSearch 是否启用搜索能力
 * @returns 完整的系统指令字符串
 */
function buildSystemInstruction(enableSearch: boolean): string {
	return `你是一个严格的内容验证专家。请分析用户输入的文本内容，判断其有效性。${enableSearch ? "运用自带的搜索能力提取相关资料并总结关键信息。" : ""}

### 1. 内容有效性校验
- **核心目标**：拦截一切明显无意义或会严重浪费Tokens的内容。
- **判定为"无效"的规则（满足任一则判定为不通过）**：
  - **乱码/不可读**：主要由随机字符、无意义符号或编码噪声构成，无法形成可理解的词语或语句。
  - **极端重复/灌水**：大段重复同一字符/词/句（如"哈哈哈……"上百上千次），或无内容的大篇幅占位符。
  - **净空内容**：仅包含空白、换行或极少量无意义字符。
- **判定为"有效"的情况（即使内容不完整或非传统文章形式，只要有意义，均视为有效）**：
  - 程序代码、配置文件、日志片段、命令行输出、公式、列表、片段化笔记、短语、单个句子等。
  - 任何非上述"无效"规则涵盖的内容。
${enableSearch
	? `
### 2. 搜索执行与总结
- **何时搜索**：
  - **经典文章**：原文来自知名文学作品、历史文献、学术论文、教科书、百科全书、正式出版物等 → **必须搜索**
  - **同人作品**：基于现有作品或流行文化的二次创作 → **必须搜索**
  - **再创作/改编**：基于现有文章或故事的改编、改写、翻译 → **必须搜索**
  - **原创/短文**：明显为独立创作，或篇幅极短、信息量有限 → **无需搜索**

- **如何总结搜索结果**：
  - 提取3-8个关键词（核心人物、作品名称、重要概念、时代背景、作者名等）执行搜索
  - 仔细阅读搜索结果
  - 在\`searchSummary\` 字段中总结关键发现，包括：
    * 作品的原始来源（如果是经典文章/同人/改编）
    * 作者信息
    * 作品背景、创作时代
    * 相关的重要事实或历史背景
    * 其他有助于理解文章的关键信息
  - 总结应简洁但包含关键事实，100-500字为宜

### 3. 作者来源判断与保险机制`
	: `
### 2. 作者来源判断与保险机制`}

- **作者身份的基本判断原则**：
  - 在未获得**明确、可验证的现实证据**之前，**不得**将用户提交的文本直接判定为某一现实作家或既有作品的创作成果。
  - 文本在风格、语言、主题上与现实作家或经典作品存在相似性，**不构成**作者归属判断的充分条件。

- **价值判断与作者判断的分离原则**：
  - 对文本写作水准、技巧成熟度、思想深度的评价，**必须**与作者身份判断相互独立。
  - 即便无法确认作者来源，仍可在不涉及具体归属的前提下，认可文本所体现的写作能力与完成度。

### ${enableSearch ? "4" : "3"}. 结果返回格式
请严格按照以下JSON格式返回结果：

\`\`\`json
{
  "success": true,
  "message": "如果success为false，提供具体原因；否则留空或简述类型。"${enableSearch
		? `,
  "searchSummary": "搜索结果的关键信息总结，未搜索则留空字符串。"`
		: ""}
}
\`\`\``;
}

/**
 * 验证文章内容的有效性
 * @param articleText 文章文本
 * @param mode 评分模式
 * @param modelId 模型ID
 * @param modelName 模型名称
 * @param fingerprint 用户指纹
 * @param enableSearch 是否启用搜索（默认 true）
 * @returns 验证结果
 */
export const verifyArticleValue = async (
	articleText: string,
	mode: string = "default",
	modelId: string,
	modelName: string,
	fingerprint: string,
	enableSearch: boolean = true,
): Promise<{
	success: boolean;
	error?: string;
	session?: string;
}> => {
	// 1. 基础预处理
	const normalizedText = articleText.replace(NORMALIZE_TEXT_REGEX, "");
	const sha1 = crypto.SHA1(normalizedText).toString();

	// 2. 查缓存（优先使用 modelName，兼容旧数据的 modelId）
	let cached = (await db_find(db_name, db_table, {
		"metadata.sha1": sha1,
		"article.input.mode": mode,
		"metadata.modelName": modelName,
	})) as DatabaseAnalysisRecord | null;

	// 如果通过 modelName 未找到，尝试用 modelId 查找（向后兼容）
	if (!cached) {
		cached = (await db_find(db_name, db_table, {
			"metadata.sha1": sha1,
			"article.input.mode": mode,
			"metadata.modelId": modelId,
		})) as DatabaseAnalysisRecord | null;
	}

	if (cached) {
		return { success: true };
	}

	// 3. 根据 enableSearch 选择使用哪个模型配置
	const modelConfig = enableSearch
		? AppConfig.system_models.validator
		: AppConfig.system_models.validator_only;

	// 4. 初始化 OpenAI 客户端
	const client = new OpenAI({
		apiKey: modelConfig.api_key,
		baseURL: modelConfig.base_url,
	});

	const validatorModelName: string = modelConfig.model || "gemini-2.0-flash";

	try {
		// 构建系统提示词
		const systemInstruction = buildSystemInstruction(enableSearch);

		// 构建 API 请求参数
		const requestBody: any = {
			model: validatorModelName,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: articleText },
			],
			// 根据是否启用搜索，动态添加 tools 或 response_format
			...(enableSearch
				? {
						tools: [
							{
								type: "function",
								function: {
									name: "googleSearch",
								},
							},
						],
					}
				: {
						response_format: { type: "json_object" },
					}),
		};

		const response = await client.chat.completions.create(requestBody);

		// 防御性检查：验证响应对象的完整性
		if (!response) {
			console.error("AI验证服务返回空响应");
			return { success: false, error: "AI验证服务无响应" };
		}

		if (!Array.isArray(response.choices) || response.choices.length === 0) {
			console.error("AI验证服务返回异常响应结构", {
				hasChoices: !!response.choices,
				choicesLength: Array.isArray(response.choices) ? response.choices.length : "N/A",
				responseKeys: Object.keys(response),
			});
			return { success: false, error: "AI验证服务返回了无效响应结构" };
		}

		const rawText = response.choices[0]?.message?.content || "";

		console.log("AI验证原始返回内容:", rawText);

		if (!rawText) {
			console.error("AI验证返回内容为空");
			return { success: false, error: "AI验证服务无响应" };
		}

		// 使用健壮的 JSON 解析器处理 AI 输出
		const parseResult = parseModelOutput<{
			success: boolean;
			message?: string;
			searchSummary?: string;
		}>(rawText);

		if (!parseResult.ok || !parseResult.data) {
			console.error("JSON解析失败:", rawText, parseResult.warnings);
			return { success: false, error: `AI返回数据格式错误: ${parseResult.warnings.join(", ")}` };
		}

		const parsedResult = parseResult.data;
		const searchWebPages: Array<{ uri: string; title?: string }> = [];

		// 简单的防守性检查
		if (typeof parsedResult.success !== "boolean") {
			return { success: false, error: "AI返回格式异常: 缺少 success 字段" };
		}

		// 提取 AI 总结的搜索信息（仅在启用搜索时才有该字段）
		const searchResults = enableSearch ? (parsedResult.searchSummary || undefined) : undefined;

		// 生成 Session
		const session = generateSessionId(16);
		await ensureTTLIndex(db_name, "sessions", "createdAt", 30 * 60);

		await db_insert(db_name, "sessions", {
			fingerprint,
			session,
			sha1,
			...(searchResults && { searchResults }),
			...(searchWebPages.length > 0 && { searchWebPages }),
			used: false,
			createdAt: new Date(),
		});

		return {
			success: parsedResult.success,
			error: parsedResult.success === false ? (parsedResult.message || "内容未通过验证") : undefined,
			session,
		};
	} catch (error: any) {
		console.error("Verify Error (API调用失败或内部处理异常):", error);
		console.error("Error Stack:", error?.stack);

		// 清理错误消息中的 SSE 格式内容
		let errorMessage = error?.message || "验证服务连接失败";
		if (errorMessage.includes("is not valid JSON") && errorMessage.includes("data:")) {
			errorMessage = "API节点返回了无法解析的数据格式（建议检查模型代理配置，或代理服务器返回了未预期的错误格式）";
		} else if (errorMessage.startsWith("data: ")) {
			const jsonMatch = errorMessage.match(JSON_MATCH_REGEX);
			if (jsonMatch) {
				const parseResult = parseModelOutput<{ error?: string; message?: string }>(jsonMatch[1]);
				if (parseResult.ok && parseResult.data) {
					errorMessage = parseResult.data.error || parseResult.data.message || errorMessage;
				} else {
					errorMessage = errorMessage.replace(DATA_PREFIX_REGEX, "").substring(0, 200);
				}
			} else {
				errorMessage = errorMessage.replace(DATA_PREFIX_REGEX, "").substring(0, 200);
			}
		}

		return {
			success: false,
			error: errorMessage,
		};
	}
};
