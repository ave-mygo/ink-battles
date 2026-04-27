import { Elysia, t } from "elysia";
import { ObjectId } from "mongodb";
import { getAnalysisConfig, getGradingModelById } from "../config";
import { COLLECTIONS, count, findOne, findOneAndUpdate, insertOne, isObjectId, objectId, updateOne, withTransaction } from "../db/mongo";
import { getCurrentUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { createProgress } from "./analysis-progress";
import { canAcceptAnalysisTask, cancelRunningTask, cleanModelName, createCachedTask, deleteTask, findCachedAnalysis, getAnalysisBackpressure, releaseAnalysisTaskSlot, reserveAnalysisTaskSlot, runAnalysisTask, sha1Article } from "./analysis-worker";
import { deductCallBalanceInTransaction } from "./billing";

const normalizeSearchModel = (value?: string): "none" | "gemini" | "gemini-lite" =>
	value === "gemini" || value === "gemini-lite" ? value : "none";

const terminalStatuses = new Set(["completed", "failed", "cancelled"]);
const activeTaskStatuses = ["pending", "processing"];
const analysisConfig = getAnalysisConfig();
const GUEST_RESULT_TTL_MS = analysisConfig.guest_result_ttl_minutes * 60 * 1000;

const isGuestRecord = (record: Record<string, any> | null) => record?.uid == null;

const isRecordHidden = (record: Record<string, any> | null) => typeof record?.privacy?.hiddenAt === "string";

const isGuestRecordExpired = (record: Record<string, any> | null, now = Date.now()) => {
	if (!record || !isGuestRecord(record))
		return false;

	const expiresAt = record.privacy?.expiresAt;
	if (typeof expiresAt !== "string")
		return false;

	return new Date(expiresAt).getTime() <= now;
};

/**
 * 游客记录只在首次真正查看结果时开始倒计时。
 * 到期后改为逻辑删除，避免继续出现在读取和缓存链路里。
 */
const activateOrHideGuestRecord = async (record: Record<string, any>) => {
	if (!record)
		return null;
	if (!isGuestRecord(record))
		return record;
	if (isRecordHidden(record))
		return null;

	const now = new Date();
	if (isGuestRecordExpired(record, now.getTime())) {
		await updateOne(COLLECTIONS.analysisRequests, { _id: record._id }, {
			"privacy.hiddenAt": now.toISOString(),
			"privacy.hideReason": "guest_expired",
		});
		return null;
	}

	if (typeof record.privacy?.expiresAt === "string")
		return record;

	const firstViewedAt = now.toISOString();
	const expiresAt = new Date(now.getTime() + GUEST_RESULT_TTL_MS).toISOString();
	return await findOneAndUpdate(COLLECTIONS.analysisRequests, {
		_id: record._id,
		uid: null,
		"privacy.hiddenAt": { $exists: false },
		"privacy.expiresAt": { $exists: false },
	}, {
		$set: {
			"privacy.firstViewedAt": firstViewedAt,
			"privacy.expiresAt": expiresAt,
		},
	}) ?? {
		...record,
		privacy: {
			...(record.privacy ?? {}),
			firstViewedAt,
			expiresAt,
		},
	};
};

const createTaskSnapshot = (task: Record<string, any>) => ({
	success: true,
	status: task.status,
	error: task.error,
	resultId: task.resultId,
	progress: task.progress,
	validation: task.validation,
	createdAt: task.createdAt,
	updatedAt: task.updatedAt,
});

const createTaskResultRecord = (record: Record<string, any>) => ({
	...record,
	_id: record._id?.toString(),
	createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
	updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
	settings: {
		...(record.settings ?? {}),
		public: record.settings?.public === true,
	},
	privacy: {
		...(record.privacy ?? {}),
	},
});

const countActiveTasksForSubmitter = (uid: number | null, fingerprint: string) =>
	count(COLLECTIONS.analysisTasks, uid
		? { uid, status: { $in: activeTaskStatuses } }
		: { uid: null, "metadata.fingerprint": fingerprint, status: { $in: activeTaskStatuses } });

export const analysisModule = new Elysia()
	.post("/api/v2/analysis/tasks", async ({ request, body }) => {
		console.log(`[analysis:submit] mode="${body.mode}" modelId="${body.modelId}" searchModel="${body.searchModel ?? "none"}" articleLength=${body.articleText?.length ?? 0}`);
		if (!body.articleText)
			return { success: false, error: "文章内容不能为空" };
		const model = getGradingModelById(body.modelId);
		if (!model)
			return { success: false, error: "无效的评分模型" };

		const user = await getCurrentUser(request.headers);
		if (model.premium && !user)
			return { success: false, error: "高级模型需要登录后使用，请先登录" };
		if (!canAcceptAnalysisTask()) {
			console.warn("[analysis:submit] rejected by backpressure", getAnalysisBackpressure());
			throw new Error("SERVICE_BUSY");
		}
		const sha1 = sha1Article(body.articleText);
		const modelName = cleanModelName(model.model);
		const normalizedSearchModel = normalizeSearchModel(body.searchModel);
		const cached = await findCachedAnalysis(sha1, body.mode, modelName, normalizedSearchModel);
		if (cached?.article?.output?.result && cached.status !== "processing") {
			const taskId = await createCachedTask({ uid: user?.uid ?? null, articleText: body.articleText, mode: body.mode, modelId: body.modelId, fingerprint: body.fingerprint, sha1, resultId: cached._id.toString() });
			return { success: true, taskId };
		}

		const activeTaskCount = await countActiveTasksForSubmitter(user?.uid ?? null, body.fingerprint);
		if (activeTaskCount >= analysisConfig.max_active_tasks_per_user)
			return { success: false, error: `最多只能同时创建 ${analysisConfig.max_active_tasks_per_user} 个进行中的分析任务，请等待已有任务完成` };
		if (!reserveAnalysisTaskSlot()) {
			console.warn("[analysis:submit] rejected by reserved backpressure", getAnalysisBackpressure());
			throw new Error("SERVICE_BUSY");
		}

		const taskId = new ObjectId();
		const createdAt = new Date().toISOString();
		let deductedFrom: "grant" | "paid" | null = null;
		try {
			if (model.premium && user) {
				try {
					await withTransaction(async (session) => {
						deductedFrom = await deductCallBalanceInTransaction(user.uid, session);
						if (!deductedFrom)
							throw new Error("INSUFFICIENT_BALANCE");
						await insertOne(COLLECTIONS.analysisTasks, {
							_id: taskId,
							uid: user.uid,
							status: "pending",
							input: body,
							metadata: {
								sha1,
								fingerprint: body.fingerprint,
								modelName,
								searchModel: normalizedSearchModel,
								session: "pending",
							},
							billing: {
								deducted: true,
								deductedFrom,
								deductedAt: createdAt,
								refunded: false,
								refundBalanceApplied: false,
							},
							progress: createProgress("queued", "任务已创建，等待后台处理", 5),
							createdAt,
							updatedAt: createdAt,
						}, session);
					});
				} catch (error) {
					if ((error as Error).message === "INSUFFICIENT_BALANCE") {
						releaseAnalysisTaskSlot();
						return { success: false, error: "调用次数不足，请前往计费管理页面充值或兑换订单" };
					}
					throw error;
				}
				writeAuditLog({ event: "billing_deducted", uid: user.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { taskId: taskId.toString(), deductedFrom } });
			} else {
				await insertOne(COLLECTIONS.analysisTasks, {
					_id: taskId,
					uid: user?.uid ?? null,
					status: "pending",
					input: body,
					metadata: {
						sha1,
						fingerprint: body.fingerprint,
						modelName,
						searchModel: normalizedSearchModel,
						session: "pending",
					},
					billing: {
						deducted: false,
						deductedFrom: null,
					},
					progress: createProgress("queued", "任务已创建，等待后台处理", 5),
					createdAt,
					updatedAt: createdAt,
				});
			}
			if (!runAnalysisTask(taskId, {
				uid: user?.uid ?? null,
				modelId: body.modelId,
				articleText: body.articleText,
				mode: body.mode,
				fingerprint: body.fingerprint,
				searchModel: normalizedSearchModel,
				isPremium: model.premium === true,
			})) {
				await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
					status: "failed",
					error: "分析服务繁忙，请稍后重试",
					progress: createProgress("failed", "分析服务繁忙，请稍后重试", 100),
					updatedAt: new Date().toISOString(),
				});
				throw new Error("SERVICE_BUSY");
			}
		} catch (error) {
			releaseAnalysisTaskSlot();
			throw error;
		}
		return {
			success: true,
			taskId: taskId.toString(),
			status: "pending",
			progress: createProgress("queued", "任务已创建，等待后台处理", 5),
		};
	}, {
		body: t.Object({
			articleText: t.String({ minLength: 1, maxLength: analysisConfig.max_article_chars }),
			mode: t.String({ minLength: 1, maxLength: analysisConfig.max_mode_chars }),
			modelId: t.String({ minLength: 1, maxLength: 128 }),
			fingerprint: t.String({ minLength: 1, maxLength: analysisConfig.max_fingerprint_chars }),
			searchModel: t.Optional(t.String({ enum: ["none", "gemini", "gemini-lite"] })),
		}),
		detail: { tags: ["REST: Analysis"] },
	})
	.get("/api/v2/analysis/tasks/:taskId", async ({ params }) => {
		if (!isObjectId(params.taskId))
			return { success: false, error: "Invalid task ID", status: "error" };
		const task = await findOne(COLLECTIONS.analysisTasks, { _id: objectId(params.taskId) });
		if (!task)
			return { success: false, error: "Task not found", status: "not_found" };
		return createTaskSnapshot(task as Record<string, any>);
	}, { detail: { tags: ["REST: Analysis"] } })
	.get("/api/v2/analysis/tasks/:taskId/result", async ({ params }) => {
		if (!isObjectId(params.taskId))
			return { success: false, message: "任务不存在" };
		const task = await findOne(COLLECTIONS.analysisTasks, { _id: objectId(params.taskId) });
		if (!task)
			return { success: false, message: "任务不存在" };
		if (!task.resultId || !isObjectId(task.resultId))
			return { success: false, message: "任务结果尚未生成" };
		const record = await activateOrHideGuestRecord(
			await findOne(COLLECTIONS.analysisRequests, { _id: objectId(task.resultId) }) as Record<string, any>,
		);
		if (!record)
			return { success: false, message: "任务结果不存在或已过期" };
		return { success: true, data: { record: createTaskResultRecord(record as Record<string, any>) } };
	}, { detail: { tags: ["REST: Analysis"] } })
	.get("/api/v2/analysis/tasks/:taskId/events", async ({ params, request }) => {
		if (!isObjectId(params.taskId)) {
			return new Response("event: error\ndata: {\"success\":false,\"error\":\"Invalid task ID\"}\n\n", {
				status: 400,
				headers: {
					"Content-Type": "text/event-stream; charset=utf-8",
					"Cache-Control": "no-cache, no-transform",
					"Connection": "keep-alive",
				},
			});
		}

		const taskId = objectId(params.taskId);
		const encoder = new TextEncoder();

		let cleanupStream = () => {};

		return new Response(new ReadableStream({
			start(controller) {
				let closed = false;
				let lastPayload = "";
				let heartbeatTimer: Timer | null = null;
				let pollTimer: Timer | null = null;
				let snapshotInFlight = false;

				const cleanup = () => {
					if (closed)
						return;
					closed = true;
					if (heartbeatTimer)
						clearInterval(heartbeatTimer);
					if (pollTimer)
						clearInterval(pollTimer);
					request.signal.removeEventListener("abort", cleanup);
				};
				cleanupStream = cleanup;

				const close = () => {
					cleanup();
					try {
						controller.close();
					} catch {
						// 客户端断开时底层 stream 可能已关闭，只需要确保资源已释放。
					}
				};

				const send = (event: string, payload: unknown) => {
					if (closed)
						return;
					try {
						controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
					} catch {
						cleanup();
					}
				};

				const pushSnapshot = async () => {
					if (closed || snapshotInFlight)
						return;
					snapshotInFlight = true;

					try {
						const task = await findOne(COLLECTIONS.analysisTasks, { _id: taskId });
						if (closed)
							return;
						if (!task) {
							send("error", { success: false, error: "Task not found", status: "not_found" });
							close();
							return;
						}

						const payload = JSON.stringify(createTaskSnapshot(task as Record<string, any>));
						if (payload !== lastPayload) {
							lastPayload = payload;
							send("snapshot", JSON.parse(payload));
						}

						if (terminalStatuses.has(String(task.status))) {
							send("end", { success: true, status: task.status });
							close();
						}
					} catch (error) {
						send("error", { success: false, error: (error as Error).message || "Task stream failed", status: "error" });
						close();
					} finally {
						snapshotInFlight = false;
					}
				};

				void pushSnapshot();
				pollTimer = setInterval(() => void pushSnapshot(), 1000);
				heartbeatTimer = setInterval(() => {
					if (closed)
						return;
					try {
						controller.enqueue(encoder.encode(": keep-alive\n\n"));
					} catch {
						cleanup();
					}
				}, 15000);
				if (request.signal.aborted)
					cleanup();
				else
					request.signal.addEventListener("abort", cleanup, { once: true });
			},
			cancel() {
				cleanupStream();
			},
		}), {
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				"Connection": "keep-alive",
				"X-Accel-Buffering": "no",
			},
		});
	}, { detail: { tags: ["REST: Analysis"] } })
	.delete("/api/v2/analysis/tasks/:taskId", async ({ params }) => {
		if (!isObjectId(params.taskId))
			return { success: false, error: "Invalid task ID" };
		return { success: await deleteTask(params.taskId) };
	}, { detail: { tags: ["REST: Analysis"] } })
	.post("/api/v2/rpc/analysis.cancelTask", async ({ body }) => {
		if (!isObjectId(body.taskId))
			return { success: false, error: "Invalid task ID" };
		const task = await findOne(COLLECTIONS.analysisTasks, { _id: objectId(body.taskId) });
		if (!task)
			return { success: false, error: "Task not found" };
		if (["completed", "failed", "cancelled"].includes(task.status as string))
			return { success: true, status: task.status };
		const cancelled = await cancelRunningTask(body.taskId);
		return { success: cancelled, status: cancelled ? "cancelled" : task.status };
	}, { body: t.Object({ taskId: t.String() }), detail: { tags: ["RPC: Analysis"] } });
