import crypto from "crypto-js";
import { ObjectId } from "mongodb";
import { getGradingModelById } from "../config";
import { COLLECTIONS, deleteOne, findOne, findOneAndUpdate, insertOne, updateMany, updateOne, withTransaction } from "../db/mongo";
import { env } from "../env";
import { runAnalysisModel } from "../integrations/ai";
import { verifyArticleValue } from "../integrations/validator";
import { writeAuditLog } from "../utils/audit";
import { parseModelOutput } from "../utils/json-parser";
import { createProgress, estimateStreamingPercent, updateTaskProgress } from "./analysis-progress";
import { refundCallBalance } from "./billing";

const NORMALIZE_TEXT_REGEX = /[\s\p{P}\p{S}]/gu;
const MODEL_PREFIX_REGEX = /^(按次|公益)-/;
const CANCELLED_MESSAGE = "分析任务已取消";
const abortControllers = new Map<string, AbortController>();
const STREAM_LIMITS = { maxContentSize: env.analysisMaxOutputChars, maxTimeoutMs: 7 * 60 * 1000, maxChunks: 20000 } as const;

interface AnalysisResult {
	title: string;
	ratingTag: string;
	finalTag: string;
	overallAssessment: string;
	summary: string;
	tags: string[];
	dimensions: Array<{ name: string; score: number; description?: string }>;
	strengths: unknown[];
	improvements: unknown[];
	authorMatches?: Array<{ name: string; styleLabel: string; description: string; confidence: number; reasons: string[] }>;
}

interface AnalysisTaskBillingSnapshot {
	billing?: {
		deductedFrom?: "grant" | "paid" | null;
	};
}

interface AnalysisTaskOptions {
	uid: number | null;
	modelId: string;
	articleText: string;
	mode: string;
	fingerprint: string;
	searchModel: "none" | "gemini" | "gemini-lite";
	isPremium: boolean;
}

interface QueuedAnalysisTask {
	taskId: ObjectId;
	options: AnalysisTaskOptions;
	abortController: AbortController;
}

const queuedAnalysisTasks: QueuedAnalysisTask[] = [];
let runningAnalysisTaskCount = 0;

export const sha1Article = (articleText: string) => crypto.SHA1(articleText.replace(NORMALIZE_TEXT_REGEX, "")).toString();
export const cleanModelName = (modelName: string) => modelName.replace(MODEL_PREFIX_REGEX, "");

export const getAnalysisBackpressure = () => ({
	running: runningAnalysisTaskCount,
	queued: queuedAnalysisTasks.length,
	maxRunning: env.analysisMaxConcurrentTasks,
	maxQueued: env.analysisMaxQueuedTasks,
	accepting: queuedAnalysisTasks.length < env.analysisMaxQueuedTasks,
});

export const canAcceptAnalysisTask = () => queuedAnalysisTasks.length < env.analysisMaxQueuedTasks;

export const recoverInterruptedAnalysisTasks = async () => {
	const now = new Date().toISOString();
	return updateMany(COLLECTIONS.analysisTasks, {
		status: { $in: ["pending", "processing"] },
	}, {
		$set: {
			status: "failed",
			error: "服务重启，未完成的分析任务已中断，请重新提交",
			progress: createProgress("failed", "服务重启，未完成的分析任务已中断，请重新提交", 100),
			updatedAt: now,
		},
	});
};

export const createCachedTask = async (input: {
	uid: number | null;
	articleText: string;
	mode: string;
	modelId: string;
	fingerprint: string;
	sha1: string;
	resultId: string;
}) => {
	const taskId = new ObjectId();
	await insertOne(COLLECTIONS.analysisTasks, {
		_id: taskId,
		uid: input.uid,
		status: "completed",
		input: { articleText: input.articleText, mode: input.mode, modelId: input.modelId },
		metadata: {
			sha1: input.sha1,
			fingerprint: input.fingerprint,
			searchModel: "none",
			session: "cached",
		},
		progress: createProgress("completed", "命中缓存，任务已完成", 100),
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		resultId: input.resultId,
	});
	return taskId.toString();
};

export const findCachedAnalysis = async (
	sha1: string,
	mode: string,
	modelName: string,
	searchModel: "none" | "gemini" | "gemini-lite",
) => {
	const now = new Date().toISOString();
	return findOne(COLLECTIONS.analysisRequests, {
		"metadata.sha1": sha1,
		"article.input.mode": mode,
		"metadata.modelName": cleanModelName(modelName),
		"privacy.hiddenAt": { $exists: false },
		$and: [
			{
				$or: [
					{ "privacy.expiresAt": { $exists: false } },
					{ "privacy.expiresAt": { $gt: now } },
				],
			},
			searchModel === "none"
				? {
						$or: [
							{ "metadata.searchModel": "none" },
							{ "metadata.searchModel": { $exists: false } },
						],
					}
				: { "metadata.searchModel": searchModel },
		],
	});
};

export const runAnalysisTask = (taskId: ObjectId, options: AnalysisTaskOptions) => {
	const key = taskId.toString();
	const abortController = new AbortController();
	abortControllers.set(key, abortController);
	queuedAnalysisTasks.push({ taskId, options, abortController });
	queueMicrotask(drainAnalysisQueue);
	return true;
};

const drainAnalysisQueue = () => {
	while (runningAnalysisTaskCount < env.analysisMaxConcurrentTasks && queuedAnalysisTasks.length > 0) {
		const nextTask = queuedAnalysisTasks.shift();
		if (!nextTask)
			return;

		runningAnalysisTaskCount++;
		queueMicrotask(async () => {
			try {
				await executeAnalysisTask(nextTask.taskId, nextTask.options, nextTask.abortController);
			} finally {
				runningAnalysisTaskCount--;
				drainAnalysisQueue();
			}
		});
	}
};

const executeAnalysisTask = async (taskId: ObjectId, options: AnalysisTaskOptions, abortController: AbortController) => {
	const key = taskId.toString();
	try {
		const model = getGradingModelById(options.modelId);
		if (!model)
			throw new Error("无效的评分模型");
		await ensureTaskActive(taskId);
		const modelName = cleanModelName(model.model);
		console.log(`[analysis:${taskId}] worker-start model=${modelName} searchModel=${options.searchModel} articleLength=${options.articleText.length}`);
		await logTaskProgress(taskId, options.searchModel === "none"
			? createProgress("validating", "正在校验文本内容", 12)
			: createProgress("searching", "正在联网搜索并校验文本内容", 12));
		const verification = await verifyArticleValue({ ...options, modelName });
		if (!verification.success)
			throw new Error(`校验失败: ${verification.error || "文章内容不符合分析标准"}`);

		console.log(`[analysis:${taskId}] validation-passed session=${verification.session || "none"}`);
		await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, { "metadata.session": verification.session || "" });
		await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
			validation: {
				success: true,
				message: options.searchModel === "none" ? "文本审核通过" : "联网审核通过",
				checkedAt: new Date().toISOString(),
			},
		});
		const search = await loadSearchContext(verification.session);
		await logTaskProgress(taskId, createProgress("analyzing", "文本审核通过，模型已开始流式分析", 45), "processing");
		const accumulatedContent = await accumulateStreamContent(taskId, options.fingerprint, async progress =>
			runAnalysisModel({
				articleText: options.articleText,
				mode: options.mode,
				modelId: options.modelId,
				fingerprint: options.fingerprint,
				searchResults: search.searchResults,
				signal: abortController.signal,
				maxOutputChars: STREAM_LIMITS.maxContentSize,
				onProgress: progress,
			}));

		await logTaskProgress(taskId, createProgress("finalizing", "正在解析结果并写入数据库", 95), "processing");
		await saveAnalysisResult({ taskId, uid: options.uid, accumulatedContent, search });
		if (verification.session) {
			await deleteOne(COLLECTIONS.sessions, { session: verification.session });
		}
	} catch (error) {
		if (await shouldTreatAsCancelled(taskId, error)) {
			await logTaskProgress(taskId, createProgress("cancelled", CANCELLED_MESSAGE, 100), "cancelled");
			if (options.uid)
				await refundTaskCallBalance(taskId, options.uid, "cancelled");
			return;
		}
		if (options.uid)
			await refundTaskCallBalance(taskId, options.uid, "failed");
		await logTaskProgress(taskId, createProgress("failed", formatAnalysisError(error), 100), "failed");
		await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
			error: formatAnalysisError(error),
			validation: {
				success: false,
				message: formatAnalysisError(error),
				checkedAt: new Date().toISOString(),
			},
		});
	} finally {
		abortControllers.delete(key);
	}
};

const accumulateStreamContent = async (
	taskId: ObjectId,
	fingerprint: string,
	runStream: (onProgress: (chunk: string, chunkCount: number) => Promise<void>) => Promise<string>,
) => {
	const startTime = Date.now();
	const maxTime = startTime + STREAM_LIMITS.maxTimeoutMs;
	let contentSize = 0;
	let lastChunkLogTime = startTime;
	return runStream(async (chunk, chunkCount) => {
		const now = Date.now();
		contentSize += chunk.length;
		if (now > maxTime)
			throw new Error(`流式处理超时 (${((now - startTime) / 1000).toFixed(1)}s)`);
		if (chunkCount >= STREAM_LIMITS.maxChunks)
			throw new Error(`流式块数量超过限制 (${STREAM_LIMITS.maxChunks})`);
		if (contentSize > STREAM_LIMITS.maxContentSize)
			throw new Error(`流式内容大小超过限制 (${STREAM_LIMITS.maxContentSize / 1024}KB)`);
		if (chunkCount % 50 === 0)
			await ensureTaskActive(taskId);
		if (chunkCount === 1 || now - lastChunkLogTime >= 5000 || chunkCount % 20 === 0) {
			const elapsedSeconds = ((now - startTime) / 1000).toFixed(1);
			console.log(
				`[analysis:${taskId}] stream-chunk fingerprint=${fingerprint} chunks=${chunkCount} chars=${contentSize} lastChunk=${chunk.length} elapsed=${elapsedSeconds}s`,
			);
			lastChunkLogTime = now;
		}
		if (chunkCount === 1 || chunkCount % 20 === 0) {
			const progress = createProgress("analyzing", `正在接收模型流式输出（${chunkCount} 块）`, estimateStreamingPercent(chunkCount, contentSize), {
				chunkCount,
				contentLength: contentSize,
			});
			await logTaskProgress(taskId, progress, "processing");
		}
	});
};

const loadSearchContext = async (session?: string) => {
	if (!session)
		return { searchResults: "", searchWebPages: undefined };
	const record = await findOne(COLLECTIONS.sessions, { session });
	return {
		searchResults: typeof record?.searchResults === "string" ? record.searchResults : "",
		searchWebPages: record?.searchWebPages,
	};
};

const refundTaskCallBalance = async (
	taskId: ObjectId,
	uid: number,
	reason: "failed" | "cancelled",
) => {
	const refundedAt = new Date().toISOString();
	let refunded = false;
	try {
		await withTransaction(async (session) => {
			const claimedTask = await findOneAndUpdate<AnalysisTaskBillingSnapshot>(COLLECTIONS.analysisTasks, {
				"_id": taskId,
				"billing.deducted": true,
				"billing.refunded": { $ne: true },
				"billing.completedAt": { $exists: false },
			}, {
				$set: {
					"billing.refunded": true,
					"billing.refundedAt": refundedAt,
					"billing.refundReason": reason,
					"updatedAt": refundedAt,
				},
			}, { returnDocument: "before", session });

			const deductedFrom = claimedTask?.billing?.deductedFrom;
			if (deductedFrom !== "grant" && deductedFrom !== "paid")
				return;

			if (!await refundCallBalance(uid, deductedFrom, session))
				throw new Error("退款余额回写失败");
			await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
				$set: {
					"billing.refundBalanceApplied": true,
					"updatedAt": refundedAt,
				},
			}, session);
			refunded = true;
		});
	} catch (error) {
		console.error(`[analysis:${taskId}] refund failed`, error);
		return false;
	}
	if (refunded)
		writeAuditLog({ event: "billing_refunded", uid, metadata: { taskId: taskId.toString(), reason } });
	return refunded;
};

const saveAnalysisResult = async (input: {
	taskId: ObjectId;
	uid: number | null;
	accumulatedContent: string;
	search: { searchResults: string; searchWebPages?: unknown };
}) => {
	if (!input.accumulatedContent.trim())
		throw new Error("AI模型返回空内容");
	const task = await findOne(COLLECTIONS.analysisTasks, { _id: input.taskId });
	if (!task)
		throw new Error("任务记录不存在");
	await ensureTaskActive(input.taskId);

	const parseResult = parseModelOutput<AnalysisResult>(input.accumulatedContent);
	if (!parseResult.ok || !parseResult.data)
		throw new Error(`无效的 JSON 格式: ${parseResult.warnings.join(", ")}`);
	if (parseResult.removed.length > 0)
		console.warn(`[${input.taskId}] 已移除 ${parseResult.removed.length} 个无效条目`, parseResult.removed);
	if (!isValidAnalysisResult(parseResult.data))
		throw new Error("返回结果格式无效");

	const overallScore = calculateFinalScore(parseResult.data);
	const resultId = new ObjectId();
	await insertOne(COLLECTIONS.analysisRequests, {
		_id: resultId,
		uid: input.uid,
		status: "completed",
		article: {
			input: {
				articleText: task.input.articleText,
				mode: task.input.mode,
				search: input.search,
			},
			output: {
				result: JSON.stringify(parseResult.data),
				overallScore,
				tags: parseResult.data.tags || [],
			},
		},
		metadata: task.metadata,
		timestamp: new Date().toISOString(),
		privacy: {},
	});
	await updateOne(COLLECTIONS.analysisTasks, { _id: input.taskId }, {
		status: "completed",
		resultId: resultId.toString(),
		input: { ...task.input, search: input.search },
		progress: createProgress("completed", "分析完成，可以查看结果", 100),
		updatedAt: new Date().toISOString(),
	});
	await updateOne(COLLECTIONS.analysisTasks, { _id: input.taskId }, {
		$set: {
			"billing.completedAt": new Date().toISOString(),
		},
	});
};

const ensureTaskActive = async (taskId: ObjectId) => {
	const task = await findOne(COLLECTIONS.analysisTasks, { _id: taskId });
	if (!task || task.status === "cancelled")
		throw new Error(CANCELLED_MESSAGE);
};

const shouldTreatAsCancelled = async (taskId: ObjectId, error: unknown) => {
	const message = (error as Error).message || "";
	const name = (error as { name?: string }).name || "";
	if (message === CANCELLED_MESSAGE || name === "AbortError" || name === "APIUserAbortError" || message.includes("abort")) {
		const task = await findOne(COLLECTIONS.analysisTasks, { _id: taskId });
		return task?.status === "cancelled" || message === CANCELLED_MESSAGE;
	}
	return false;
};

const formatAnalysisError = (error: unknown) => {
	const message = (error as Error).message || "分析失败";
	return message.includes("stream") || message.includes("流式") ? `流式处理失败: ${message}` : message;
};

const calculateFinalScore = (result: AnalysisResult): number => {
	const dimensions = Array.isArray(result.dimensions) ? result.dimensions : [];
	const baseDimensions = dimensions.filter(item => !item.name.includes("经典") && !item.name.includes("新锐"));
	const countAbove35 = baseDimensions.filter(item => item.score > 3.5).length;
	const countAbove40 = baseDimensions.filter(item => item.score > 4).length;
	if (countAbove35 >= 6 || countAbove40 >= 3) {
		for (const dimension of baseDimensions) {
			if (dimension.score < 3)
				dimension.score = 3;
		}
	}
	const baseScore = baseDimensions.reduce((sum, item) => sum + (item.score || 0), 0);
	const classicityWeight = dimensions.find(item => item.name.includes("经典"))?.score || 1;
	const noveltyWeight = dimensions.find(item => item.name.includes("新锐"))?.score || 1;
	const finalScore = baseScore * classicityWeight * noveltyWeight;
	return Number.isFinite(finalScore) ? Math.round(finalScore * 100) / 100 : 0;
};

const isValidAnalysisResult = (result: AnalysisResult) =>
	!!result
	&& ["title", "ratingTag", "finalTag", "overallAssessment", "summary"].every(field => typeof result[field as keyof AnalysisResult] === "string")
	&& Array.isArray(result.tags)
	&& result.tags.length > 0
	&& Array.isArray(result.dimensions)
	&& result.dimensions.every(item => typeof item.name === "string" && typeof item.score === "number" && item.score >= 0 && item.score <= 5 && typeof item.description === "string")
	&& Array.isArray(result.strengths)
	&& Array.isArray(result.improvements)
	&& (result.authorMatches === undefined || result.authorMatches.every(item =>
		typeof item.name === "string"
		&& typeof item.styleLabel === "string"
		&& typeof item.description === "string"
		&& typeof item.confidence === "number"
		&& Array.isArray(item.reasons)));

export const cancelRunningTask = async (taskId: string) => {
	abortControllers.get(taskId)?.abort(CANCELLED_MESSAGE);
	abortControllers.delete(taskId);
	const queuedIndex = queuedAnalysisTasks.findIndex(task => task.taskId.toString() === taskId);
	if (queuedIndex >= 0)
		queuedAnalysisTasks.splice(queuedIndex, 1);
	const cancelledAt = new Date().toISOString();
	return updateOne(COLLECTIONS.analysisTasks, { _id: new ObjectId(taskId) }, {
		$set: {
			"status": "cancelled",
			"error": CANCELLED_MESSAGE,
			"progress": createProgress("cancelled", CANCELLED_MESSAGE, 100),
			"billing.cancelRequestedAt": cancelledAt,
			"updatedAt": cancelledAt,
		},
	});
};

export const deleteTask = (taskId: string) => deleteOne(COLLECTIONS.analysisTasks, { _id: new ObjectId(taskId) });

const logTaskProgress = async (
	taskId: ObjectId,
	progress: ReturnType<typeof createProgress>,
	status?: "pending" | "processing" | "completed" | "failed" | "cancelled",
) => {
	console.log(`[analysis:${taskId}] ${progress.stage} ${progress.percent}% ${progress.message}`);
	await updateTaskProgress(taskId, progress, status);
};
