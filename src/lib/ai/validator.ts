"use server";
import type { DatabaseAnalysisRecord } from "@/types/database/analysis_requests";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto-js";
import { getConfig } from "@/config";
import { db_name, db_table } from "@/lib/constants";
import { db_find, db_insert, ensureTTLIndex } from "@/lib/db";
import { generateSessionId } from "@/utils/auth/sessions";
import "server-only";

const AppConfig = getConfig();

/**
 * 验证文章内容的有效性
 * @param articleText 文章文本
 * @param mode 评分模式
 * @param modelId 模型ID
 * @param modelName 模型名称
 * @param fingerprint 用户指纹
 * @returns 验证结果
 */
export const verifyArticleValue = async (
	articleText: string,
	mode: string = "default",
	modelId: string,
	modelName: string,
	fingerprint: string,
): Promise<{
	success: boolean;
	error?: string;
	session?: string;
}> => {
	// 1. 基础预处理
	const normalizedText = articleText.replace(/[\s\p{P}\p{S}]/gu, "");
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

	// 3. 初始化 Google GenAI 客户端
	const client = new GoogleGenAI({
		apiKey: AppConfig.system_models.validator.api_key,
		httpOptions: {
			baseUrl: AppConfig.system_models.validator.base_url,
		},
	});

	const validatorModelName: string = AppConfig.system_models.validator.model || "gemini-2.0-flash";

	try {
		const response = await client.models.generateContent({
			model: validatorModelName,
			config: {
				// 启用 Google 搜索接地
				tools: [
					{
						googleSearch: {},
					},
				],
				systemInstruction: `你是一个严格的内容验证专家。请分析用户输入的文本内容，判断其有效性，并在必要时使用 Google 搜索工具查找相关资料并总结关键信息。

### 1. 内容有效性校验
- **核心目标**：拦截一切明显无意义或会严重浪费Tokens的内容。
- **判定为"无效"的规则（满足任一则判定为不通过）**：
  - **乱码/不可读**：主要由随机字符、无意义符号或编码噪声构成，无法形成可理解的词语或语句。
  - **极端重复/灌水**：大段重复同一字符/词/句（如"哈哈哈……"上百上千次），或无内容的大篇幅占位符。
  - **净空内容**：仅包含空白、换行或极少量无意义字符。
- **判定为"有效"的情况（即使内容不完整或非传统文章形式，只要有意义，均视为有效）**：
  - 程序代码、配置文件、日志片段、命令行输出、公式、列表、片段化笔记、短语、单个句子等。
  - 任何非上述"无效"规则涵盖的内容。

### 2. 搜索执行与总结
- **何时搜索**：
  - **经典文章**：原文来自知名文学作品、历史文献、学术论文、教科书、百科全书、正式出版物等 → **必须搜索**
  - **同人作品**：基于现有作品或流行文化的二次创作 → **必须搜索**
  - **再创作/改编**：基于现有文章或故事的改编、改写、翻译 → **必须搜索**
  - **原创/短文**：明显为独立创作，或篇幅极短、信息量有限 → **无需搜索**
  
- **如何总结搜索结果**：
  - 提取3-8个关键词（核心人物、作品名称、重要概念、时代背景、作者名等）执行搜索
  - 仔细阅读搜索结果
  - 在 \`searchSummary\` 字段中总结关键发现，包括：
    * 作品的原始来源（如果是经典文章/同人/改编）
    * 作者信息
    * 作品背景、创作时代
    * 相关的重要事实或历史背景
    * 其他有助于理解文章的关键信息
  - 总结应简洁但包含关键事实，100-500字为宜
**作者来源判断与保险机制（补充规则）**：

- **作者身份的基本判断原则**：
  - 在未获得**明确、可验证的现实证据**之前，**不得**将用户提交的文本直接判定为某一现实作家或既有作品的创作成果。
  - 文本在风格、语言、主题上与现实作家或经典作品存在相似性，**不构成**作者归属判断的充分条件。

- **不确定来源情形的处理方式**：
  - 若经检索后，无法确认文本对应某一已知作品或已发表文本，应明确视为**来源不确定文本**。
  - 在来源不确定的情况下，允许作出如下说明性判断：
    - 该文本基本可推断为用户原创作品；
    - 亦不排除为高完成度的未发表创作；
    - 但不得作出任何确定性的作者归属结论。

- **防止误归因的安全要求**：
  - 不得因文本完成度较高、技巧成熟，而自动推定其作者为现实中的知名作家。
  - 不得使用"出自某某之手""显然为某作家作品"等确定性表述，除非存在清晰、可核查的事实依据。

- **价值判断与作者判断的分离原则**：
  - 对文本写作水准、技巧成熟度、思想深度的评价，**必须**与作者身份判断相互独立。
  - 即便无法确认作者来源，仍可在不涉及具体归属的前提下，认可文本所体现的写作能力与完成度。

- **总则**：
  - 在任何存在判断不确定性的情况下，应优先采用**保守、去归因化**的表述方式，明确说明信息不足，而非作出推断性结论。

**创作大纲与规划性文本的评分适用性说明（补充规则）**：

- **文本类型识别原则**：
  - 若用户提交的文本主要以情节提要、章节规划、世界观设定、人物关系说明、创作构想说明或整体结构蓝图为主要内容，而非完整展开的叙事文本、诗歌文本或成品章节，应视为**创作大纲或规划性文本**。
  - 判断依据以文本的功能取向为准，即其目的是否在于"规划如何写"，而非"实际写出文本本身"。

- **评分适用性声明**：
  - 对创作大纲或规划性文本，系统仍可基于其构想完整度、结构清晰度与创意密度进行评分。
  - **但必须明确标注：该评分仅反映构想层面的潜力与设计能力，不等同于成品文本质量，其结果不具有代表性**。

- **防止完成度误判的约束要求**：
  - 不得因文本结构完整、主题集中或设定密集，而将其评分结果直接等同于已完成作品的文学成熟度。
  - 不得将大纲类文本的高分解释为文笔成熟、语言完成度高或已具备出版级文本质量。

- **评分用途限制说明**：
  - 大纲文本的评分结果不应作为横向比较不同作者文本水平、判断作品完成度或推断真实创作能力上限的直接依据。
  - 该评分仅可用于辅助理解创作构想的方向性、复杂度与潜在展开价值。

- **总则**：
  - 在文本尚未以完整叙事或完整诗歌形式呈现之前，应始终区分"构想表现"与"文本实现"，避免因体裁阶段差异导致评分解释失真。

### 3. 结果返回格式
请严格按照以下JSON格式返回结果：

\`\`\`json
{
  "success": true, // 或 false
  "message": "如果success为false，提供具体原因；否则留空或简述类型。",
  "searchSummary": "如果执行了搜索，在此总结搜索发现的关键信息；否则留空。"
}
\`\`\`

**重要**：searchSummary 应该是你对搜索结果的总结，而不是搜索结果的原始内容。
`,
			},
			contents: [
				{
					role: "user",
					parts: [{ text: articleText }],
				},
			],
		});

		// 修正点：Node.js SDK 中通过 response.text 获取文本，需要手动解析 JSON
		const rawText = response.text;

		if (!rawText) {
			console.error("AI验证返回内容为空");
			return { success: false, error: "AI验证服务无响应" };
		}

		// 提取 Google 搜索引擎使用的网页信息
		let searchWebPages: Array<{ uri: string; title?: string }> = [];
		try {
			// 从响应的候选答案中提取 groundingMetadata
			if (response.candidates?.[0]?.groundingMetadata) {
				const groundingMetadata = response.candidates[0].groundingMetadata;

				// 提取搜索入口点（searchEntryPoint）中的渲染内容
				if (groundingMetadata.searchEntryPoint) {
					// 搜索入口点通常包含渲染的HTML内容，但我们主要关注groundingChunks
				}

				// 提取 groundingChunks 中的网页信息
				if (groundingMetadata.groundingChunks) {
					searchWebPages = groundingMetadata.groundingChunks
						.filter((chunk: any) => chunk.web)
						.map((chunk: any) => ({
							uri: chunk.web.uri,
							title: chunk.web.title || undefined,
						}));
				}
			}
		} catch (error) {
			console.warn("提取搜索网页信息失败:", error);
		}

		// 更健壮的 JSON 提取逻辑
		// 1. 尝试从 Markdown 代码块中提取 (优化正则避免回溯)
		const codeBlockMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/);
		let jsonContent: string;

		if (codeBlockMatch) {
			jsonContent = codeBlockMatch[1].trim();
		} else {
			// 2. 尝试直接匹配 JSON 对象
			const jsonObjectMatch = rawText.match(/\{[\s\S]*\}/);
			if (jsonObjectMatch) {
				jsonContent = jsonObjectMatch[0].trim();
			} else {
				// 3. 回退到原始文本（去除代码块标记）
				jsonContent = rawText.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "").trim();
			}
		}

		let parsedResult: {
			success: boolean;
			message?: string;
			searchSummary?: string;
		};

		try {
			parsedResult = JSON.parse(jsonContent);
		} catch {
			console.error("JSON解析失败:", rawText);
			return { success: false, error: "AI返回数据格式错误" };
		}

		// 简单的防守性检查
		if (typeof parsedResult.success !== "boolean") {
			return { success: false, error: "AI返回格式异常: 缺少 success 字段" };
		}

		// 提取 AI 总结的搜索信息
		const searchResults = parsedResult.searchSummary || undefined;

		// 生成 Session
		const session = generateSessionId(16);
		await ensureTTLIndex(db_name, "sessions", "createdAt", 30 * 60);

		await db_insert(db_name, "sessions", {
			fingerprint,
			session,
			sha1,
			searchResults,
			searchWebPages: searchWebPages.length > 0 ? searchWebPages : undefined,
			used: false,
			createdAt: new Date(),
		});

		return {
			success: parsedResult.success,
			error: parsedResult.success === false ? (parsedResult.message || "内容未通过验证") : undefined,
			session,
		};
	} catch (error: any) {
		console.error("Gemini Verify Error:", error);
		return {
			success: false,
			error: error?.message || "验证服务连接失败",
		};
	}
};
