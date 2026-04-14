"use server";

import type { AnalysisResult } from "@/types/ai";

import crypto from "crypto-js";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { after } from "next/server";
import OpenAI from "openai";

import { getGradingModelById } from "@/config";
import { buildSystemPrompt, calculateFinalScore, getModeInstructions } from "@/lib/ai";
import { db_name, db_table } from "@/lib/constants";
import { db_delete, db_find, db_findById, db_insert, db_update } from "@/lib/db";
import { parseModelOutput } from "@/lib/json-parser";
import { getCurrentUserInfo } from "@/utils/auth/server";
import { deductCallBalance, refundCallBalance } from "@/utils/billing/server";
import "server-only";

// 预编译正则表达式，避免每次调用时重新编译
const NORMALIZE_TEXT_REGEX = /[\s\p{P}\p{S}]/gu;
const MODEL_PREFIX_REGEX = /^(按次|公益)-/;

export interface SubmitAnalysisInput {
	articleText: string;
	mode: string;
	modelId: string;
	fingerprint: string;
	searchModel?: "none" | "gemini" | "gemini-lite";
}

export async function submitAnalysisAction(input: SubmitAnalysisInput) {
	const requestId = crypto.lib.WordArray.random(8).toString();
	const { articleText, mode, modelId, fingerprint, searchModel = "none" } = input;

	if (!articleText || typeof articleText !== "string") {
		return { success: false, error: "文章内容不能为空" };
	}

	const gradingModel = getGradingModelById(modelId);
	if (!gradingModel) {
		return { success: false, error: "无效的评分模型" };
	}

	const user = await getCurrentUserInfo();
	const uid = user?.uid || null;
	const isPremiumModel = gradingModel.premium === true;

	if (isPremiumModel && !uid) {
		return { success: false, error: "高级模型需要登录后使用，请先登录" };
	}

	const normalizedText = articleText.replace(NORMALIZE_TEXT_REGEX, "");
	const sha1 = crypto.SHA1(normalizedText).toString();
	const cleanModelName = gradingModel.model.replace(MODEL_PREFIX_REGEX, "");

	// 查询是否存在成功的分析记录
	const cached = await db_find(db_name, db_table, {
		"metadata.sha1": sha1,
		"article.input.mode": mode,
		"metadata.modelName": cleanModelName,
	});

	if (cached && cached.metadata?.sha1 === sha1 && cached.article?.output?.result && cached.status !== "processing") {
		// 如果记录已存在，为了适配前端等待任务的逻辑，仍然返回一个伪造的极速完成的taskId，或者直接抛出一个可以识别的值
		// 为了简单起见，我们创建一个已完成的 task
		const cachedResultId = cached._id.toString();
		const cachedTaskId = new ObjectId();
		await db_insert(db_name, "analysis_tasks", {
			_id: cachedTaskId,
			uid,
			status: "completed",
			input: { articleText, mode, modelId },
			metadata: { sha1, ip: null, fingerprint, modelName: cleanModelName, session: "cached" },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			resultId: cachedResultId,
		});

		return { success: true, taskId: cachedTaskId.toString() };
	}

	const headerStore = await headers();
	const ip = headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip") || null;

	// 预扣费：高级模型先原子扣减一次调用次数，防止并发请求绕过余额检查
	// 如果后续处理失败，在 catch 中退还
	let preDeducted = false;
	if (isPremiumModel && uid) {
		preDeducted = await deductCallBalance(uid);
		if (!preDeducted) {
			return { success: false, error: "调用次数不足，请前往计费管理页面充值或兑换订单" };
		}
	}

	const taskId = new ObjectId();

	await db_insert(db_name, "analysis_tasks", {
		_id: taskId,
		uid,
		status: "pending",
		input: {
			articleText,
			mode: mode || "default",
			modelId,
			search: { searchResults: "", searchWebPages: undefined },
		},
		metadata: { sha1, ip, fingerprint, modelName: cleanModelName, session: "pending" },
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});

	after(async () => {
		try {
			console.log(`[${fingerprint}:${requestId}] 开始后台校验...`);

			// 动态导入避免可能的循环依赖或初始化顺序问题
			const { verifyArticleValue } = await import("@/lib/ai/validator");

			const verifyResult = await verifyArticleValue(articleText, mode, modelId, cleanModelName, fingerprint, searchModel);

			if (!verifyResult.success) {
				throw new Error(`校验失败: ${verifyResult.error || "文章内容不符合分析标准"}`);
			}

			const session = verifyResult.session || "";

			// 校验成功，更新状态为处理中
			await db_update(db_name, "analysis_tasks", { _id: taskId }, { "status": "processing", "metadata.session": session });

			const sessionRecords = await db_find(db_name, "sessions", { session });
			const searchResults = sessionRecords?.searchResults || null;
			const searchWebPages = sessionRecords?.searchWebPages || null;

			console.log(`[${fingerprint}:${requestId}] 后台处理开始，baseURL: ${gradingModel.base_url}, model: ${gradingModel.model}, supports_json_mode: ${gradingModel.supports_json_mode}`);

			const openAI = new OpenAI({
				apiKey: gradingModel.api_key,
				baseURL: gradingModel.base_url,
			});

			const modeInstruction = await getModeInstructions(mode);
			const systemPrompt = await buildSystemPrompt(modeInstruction);

			const messages: Array<{ role: "system" | "user"; content: string }> = [
				{ role: "system", content: systemPrompt },
			];

			if (searchResults) {
				messages.push({ role: "user", content: `以下是通过搜索获得的背景资料总结（供参考）：\n\n${searchResults}` });
			}
			messages.push({ role: "user", content: articleText });

			// 使用流式获取以提供更好的用户体验和更快的首字节时间
			const stream = await openAI.chat.completions.create({
				model: gradingModel.model,
				messages,
				temperature: gradingModel.model.includes("gpt-5-nano") ? 1 : 0.3,
				...(gradingModel.supports_json_mode !== false ? { response_format: { type: "json_object" } } : {}),
				seed: fingerprint ? Number.parseInt(fingerprint) : undefined,
				stream: true,
			});

			const content = await accumulateStreamContent(stream, fingerprint, requestId);

			if (!content.trim()) {
				throw new Error("AI模型返回空内容");
			}

			// 更新 DB 添加 searchResults 缓存
			await db_update(db_name, "analysis_tasks", { _id: taskId }, {
				"input.search": { searchResults: searchResults || "", searchWebPages: searchWebPages || undefined },
			});

			// 预扣费模式：已在提交时扣费，此处标记为非扣费模式
			await updateDatabaseWithResult({
				taskId,
				accumulatedContent: content,
				uid,
				isPremiumModel: false, // 预扣费已完成
				preDeducted, // 传递预扣费标记
				session,
			});

			console.log(`[${fingerprint}:${requestId}]后台任务完成！`);
		} catch (error) {
			console.error(`[${fingerprint}:${requestId}] 后台任务失败:`, error);

			// 任务失败时退还预扣费（仅在确实预扣费的情况下）
			if (preDeducted && uid) {
				const refunded = await refundCallBalance(uid);
				if (refunded) {
					console.log(`[${fingerprint}:${requestId}] 任务失败，已退还预扣费用给用户 ${uid}`);
				} else {
					console.error(`[严重] [${fingerprint}:${requestId}] 任务失败且退还预扣费用失败，用户 ${uid} 需人工对账`);
				}
			}

			// 区分流式相关错误
			let errorMessage = (error as Error).message;
			if (errorMessage.includes("stream") || errorMessage.includes("流式")) {
				errorMessage = `流式处理失败: ${errorMessage}`;
			}

			await db_update(db_name, "analysis_tasks", { _id: taskId }, {
				updatedAt: new Date().toISOString(),
				status: "failed",
				error: errorMessage,
			});
		}
	});

	return { success: true, taskId: taskId.toString() };
}

/**
 * 流式内容累积的安全限制
 */
const STREAM_LIMITS = {
	// 最大内容大小 (1MB)
	MAX_CONTENT_SIZE: 1024 * 1024,
	// 最大超时时间 (7分钟)
	MAX_TIMEOUT_MS: 7 * 60 * 1000,
	// 最大块数量 (防止无限流)
	MAX_CHUNKS: 20000,
} as const;

/**
 * 处理流式响应并累积内容（内存安全版本）
 * @param stream - OpenAI 流式响应
 * @param fingerprint - 文章指纹，用于日志
 * @param requestId - 请求ID，用于日志
 * @returns 累积的完整内容
 * @throws {Error} 当超过安全限制时抛出错误
 */
async function accumulateStreamContent(
	stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
	fingerprint: string,
	requestId: string,
): Promise<string> {
	let accumulatedContent = "";
	let chunkCount = 0;
	const startTime = Date.now();
	let lastLogTime = startTime;
	const maxTime = startTime + STREAM_LIMITS.MAX_TIMEOUT_MS;

	// 获取迭代器以便后续清理
	const iterator = stream[Symbol.asyncIterator]();

	try {
		while (true) {
			const now = Date.now();

			// 超时保护
			if (now > maxTime) {
				const elapsed = ((now - startTime) / 1000).toFixed(1);
				throw new Error(`流式处理超时 (${elapsed}s，超过限制 ${STREAM_LIMITS.MAX_TIMEOUT_MS / 1000}s)`);
			}

			// 块数量保护
			if (chunkCount >= STREAM_LIMITS.MAX_CHUNKS) {
				throw new Error(`流式块数量超过限制 (${STREAM_LIMITS.MAX_CHUNKS})`);
			}

			const { done, value: chunk } = await iterator.next();

			// 流结束
			if (done || !chunk) {
				break;
			}

			const delta = chunk.choices[0]?.delta?.content;
			if (delta) {
				// 内容大小保护
				if (accumulatedContent.length + delta.length > STREAM_LIMITS.MAX_CONTENT_SIZE) {
					throw new Error(
						`流式内容大小超过限制 (${STREAM_LIMITS.MAX_CONTENT_SIZE / 1024}KB)，当前: ${((accumulatedContent.length + delta.length) / 1024).toFixed(1)}KB`,
					);
				}

				accumulatedContent += delta;
				chunkCount++;

				// 每5秒或每50个块记录一次进度
				if (now - lastLogTime > 5000 || chunkCount % 50 === 0) {
					const elapsed = ((now - startTime) / 1000).toFixed(1);
					console.log(`[${fingerprint}:${requestId}] 流式进度: ${chunkCount} 块, ${accumulatedContent.length} 字符, 耗时 ${elapsed}s`);
					lastLogTime = now;
				}
			}
		}

		const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`[${fingerprint}:${requestId}] 流式完成: 总计 ${chunkCount} 块, ${accumulatedContent.length} 字符, 耗时 ${totalTime}s`);

		return accumulatedContent;
	} catch (error) {
		// 确保错误信息清晰，便于调试
		const errorMsg = (error as Error).message;
		console.error(`[${fingerprint}:${requestId}] 流式处理失败 (块数: ${chunkCount}, 内容: ${accumulatedContent.length} 字符): ${errorMsg}`);
		throw error;
	} finally {
		// 显式释放迭代器资源，确保底层 HTTP 连接被关闭
		// 这是防御性编程：即使 for-await 会自动清理，我们也要显式确保
		try {
			await iterator.return?.();
		} catch (e) {
			// 忽略清理过程中的错误，因为此时我们已经处理了主要错误
			console.warn(`[${fingerprint}:${requestId}] 流式清理警告: ${(e as Error).message}`);
		}
	}
}

async function updateDatabaseWithResult({
	taskId,
	accumulatedContent,
	uid,
	isPremiumModel,
	preDeducted = false,
	session,
}: {
	taskId: ObjectId;
	accumulatedContent: string;
	uid: number | null;
	isPremiumModel: boolean;
	preDeducted?: boolean;
	session: string;
}) {
	// 获取任务信息
	const task = await db_find(db_name, "analysis_tasks", { _id: taskId });
	if (!task) {
		throw new Error("任务记录不存在");
	}

	// 使用健壮的 JSON 解析器处理 AI 输出
	const parseResult = parseModelOutput<AnalysisResult>(accumulatedContent);

	if (!parseResult.ok || !parseResult.data) {
		console.error("JSON 解析失败，原始内容:", accumulatedContent, "警告:", parseResult.warnings);
		throw new Error(`无效的 JSON 格式: ${parseResult.warnings.join(", ")}`);
	}

	const parsedResult = parseResult.data;

	// 记录被移除的无效条目（如无效的 mermaid 图表）
	if (parseResult.removed.length > 0) {
		console.warn(`[${taskId}] 已移除 ${parseResult.removed.length} 个无效条目:`, parseResult.removed);
	}

	if (!isValidAnalysisResult(parsedResult)) {
		throw new Error("返回结果格式无效");
	}

	const tags = parsedResult.tags || [];
	const overallScore = await calculateFinalScore(parsedResult);
	const finalResult = JSON.stringify(parsedResult);

	// === 关键操作顺序：插入记录 → 验证扣费 → 标记完成 → 清理 ===
	// 任何一步失败都会抛出异常，由外层 catch 将任务标记为 failed

	// 1. 插入到最终的分析记录表（失败则中止，不继续）
	const analysisId = new ObjectId();
	const insertOk = await db_insert(db_name, db_table, {
		_id: analysisId,
		uid,
		status: "completed",
		article: {
			input: {
				articleText: task.input.articleText,
				mode: task.input.mode,
				search: task.input.search,
			},
			output: {
				result: finalResult,
				overallScore,
				tags,
			},
		},
		metadata: {
			sha1: task.metadata.sha1,
			ip: task.metadata.ip,
			fingerprint: task.metadata.fingerprint,
			modelName: task.metadata.modelName,
		},
		timestamp: new Date().toISOString(),
	}, true); // throwOnError = true

	if (!insertOk) {
		throw new Error("分析结果写入数据库失败");
	}

	// 2. 验证扣费状态（预扣费模式下已扣费，此处仅验证）
	if (preDeducted) {
		// 预扣费模式：费用已在任务提交时扣除，此处无需操作
		console.log(`[${taskId}] 预扣费模式，费用已在提交时扣除`);
	} else if (isPremiumModel && uid) {
		// 非预扣费模式（旧逻辑兼容）：此处扣费
		const balanceDeducted = await deductCallBalance(uid);
		if (!balanceDeducted) {
			// 扣费失败必须抛出异常，防止出结果不扣费
			throw new Error(`用户 ${uid} 调用次数不足，分析结果 ${analysisId} 已入库但无法扣费`);
		}
	}

	// 3. 更新任务表状态为 completed 并关联 analysisId
	const updateOk = await db_update(
		db_name,
		"analysis_tasks",
		{ _id: taskId },
		{
			status: "completed",
			updatedAt: new Date().toISOString(),
			resultId: analysisId.toString(),
		},
		true, // throwOnError = true
	);

	if (!updateOk) {
		console.error(`[警告] 任务 ${taskId} 状态更新失败，但分析结果 ${analysisId} 已入库`);
	}

	// 4. 清理 session（非关键操作，失败不影响主流程）
	await db_delete(db_name, "sessions", { session });
}

function isValidAnalysisResult(result: any): boolean {
	if (!result || typeof result !== "object")
		return false;
	const requiredStringFields = ["title", "ratingTag", "finalTag", "overallAssessment", "summary"];
	for (const field of requiredStringFields) {
		if (typeof result[field] !== "string" || result[field].trim() === "")
			return false;
	}
	if (!Array.isArray(result.tags) || result.tags.length === 0)
		return false;
	if (!Array.isArray(result.dimensions) || result.dimensions.length === 0)
		return false;
	for (const dimension of result.dimensions) {
		if (!dimension.name || typeof dimension.name !== "string")
			return false;
		if (typeof dimension.score !== "number" || dimension.score < 0 || dimension.score > 5)
			return false;
		if (!dimension.description || typeof dimension.description !== "string")
			return false;
	}
	if (!Array.isArray(result.strengths) || result.strengths.length === 0)
		return false;
	if (!Array.isArray(result.improvements) || result.improvements.length === 0)
		return false;
	if (result.authorMatches !== undefined) {
		if (!Array.isArray(result.authorMatches))
			return false;
		for (const authorMatch of result.authorMatches) {
			if (!authorMatch || typeof authorMatch !== "object")
				return false;
			if (typeof authorMatch.name !== "string" || authorMatch.name.trim() === "")
				return false;
			if (typeof authorMatch.styleLabel !== "string" || authorMatch.styleLabel.trim() === "")
				return false;
			if (typeof authorMatch.description !== "string" || authorMatch.description.trim() === "")
				return false;
			if (typeof authorMatch.confidence !== "number" || authorMatch.confidence < 0 || authorMatch.confidence > 100)
				return false;
			if (!Array.isArray(authorMatch.reasons) || authorMatch.reasons.length === 0)
				return false;
			if (authorMatch.reasons.some((reason: unknown) => typeof reason !== "string" || reason.trim() === ""))
				return false;
		}
	}
	return true;
}

export async function getAnalysisStatusAction(taskId: string) {
	try {
		const task = await db_findById(db_name, "analysis_tasks", taskId);
		if (!task) {
			return { success: false, error: "Task not found", status: "not_found" };
		}

		return {
			success: true,
			status: task.status,
			error: task.error,
			resultId: task.resultId,
			createdAt: task.createdAt,
			updatedAt: task.updatedAt,
		};
	} catch (error) {
		return { success: false, error: (error as Error).message, status: "error" };
	}
}

export async function deleteAnalysisTaskAction(taskId: string) {
	try {
		if (!ObjectId.isValid(taskId)) {
			return { success: false, error: "Invalid task ID" };
		}
		const deleted = await db_delete(db_name, "analysis_tasks", { _id: new ObjectId(taskId) });
		return { success: deleted };
	} catch (error) {
		return { success: false, error: (error as Error).message };
	}
}
