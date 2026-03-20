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
import { deductCallBalance, hasAvailableCalls } from "@/utils/billing/server";
import "server-only";

// 预编译正则表达式，避免每次调用时重新编译
const NORMALIZE_TEXT_REGEX = /[\s\p{P}\p{S}]/gu;
const MODEL_PREFIX_REGEX = /^(按次|公益)-/;

export interface SubmitAnalysisInput {
	articleText: string;
	mode: string;
	modelId: string;
	fingerprint: string;
	enableSearch?: boolean;
}

export async function submitAnalysisAction(input: SubmitAnalysisInput) {
	const requestId = crypto.lib.WordArray.random(8).toString();
	const { articleText, mode, modelId, fingerprint, enableSearch = true } = input;

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

	if (isPremiumModel && uid) {
		const hasCalls = await hasAvailableCalls(uid);
		if (!hasCalls) {
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

			const verifyResult = await verifyArticleValue(articleText, mode, modelId, cleanModelName, fingerprint, enableSearch);

			if (!verifyResult.success) {
				throw new Error(`校验失败: ${verifyResult.error || "文章内容不符合分析标准"}`);
			}

			const session = verifyResult.session || "";

			// 校验成功，更新状态为处理中
			await db_update(db_name, "analysis_tasks", { _id: taskId }, { "status": "processing", "metadata.session": session });

			const sessionRecords = await db_find(db_name, "sessions", { session });
			const searchResults = sessionRecords?.searchResults || null;
			const searchWebPages = sessionRecords?.searchWebPages || null;

			console.log(`[${fingerprint}:${requestId}] 后台处理开始，baseURL: ${gradingModel.base_url}, model: ${gradingModel.model}`);

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

			// 直接获取文本而不是流式，以减少连接时间
			const response = await openAI.chat.completions.create({
				model: gradingModel.model,
				messages,
				temperature: gradingModel.model.includes("gpt-5-nano") ? 1 : 0.3,
				response_format: { type: "json_object" },
				seed: fingerprint ? Number.parseInt(fingerprint) : undefined,
			});

			const content = response.choices[0]?.message?.content || "";

			if (!content.trim()) {
				throw new Error("AI模型返回空内容");
			}

			// 更新 DB 添加 searchResults 缓存
			await db_update(db_name, "analysis_tasks", { _id: taskId }, {
				"input.search": { searchResults: searchResults || "", searchWebPages: searchWebPages || undefined },
			});

			await updateDatabaseWithResult({
				taskId,
				accumulatedContent: content,
				uid,
				isPremiumModel,
				session,
			});

			console.log(`[${fingerprint}:${requestId}]后台任务完成！`);
		} catch (error) {
			console.error(`[${fingerprint}:${requestId}] 后台任务失败:`, error);
			await db_update(db_name, "analysis_tasks", { _id: taskId }, {
				updatedAt: new Date().toISOString(),
				status: "failed",
				error: (error as Error).message,
			});
		}
	});

	return { success: true, taskId: taskId.toString() };
}

async function updateDatabaseWithResult({
	taskId,
	accumulatedContent,
	uid,
	isPremiumModel,
	session,
}: {
	taskId: ObjectId;
	accumulatedContent: string;
	uid: number | null;
	isPremiumModel: boolean;
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

	// 1. 插入到最终的分析记录表
	const analysisId = new ObjectId();
	await db_insert(db_name, db_table, {
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
	});

	// 2. 更新任务表状态为 completed并关联 analysisId
	await db_update(
		db_name,
		"analysis_tasks",
		{ _id: taskId },
		{
			status: "completed",
			updatedAt: new Date().toISOString(),
			resultId: analysisId.toString(),
		},
	);

	await db_delete(db_name, "sessions", { session });

	if (isPremiumModel && uid) {
		await deductCallBalance(uid);
	}
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
