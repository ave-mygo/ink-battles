import { Elysia, t } from "elysia";
import { ObjectId } from "mongodb";
import { getGradingModelById } from "../config";
import { COLLECTIONS, count, findOne, insertOne, isObjectId, objectId, withTransaction } from "../db/mongo";
import { env } from "../env";
import { getCurrentUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { createProgress } from "./analysis-progress";
import { canAcceptAnalysisTask, cancelRunningTask, cleanModelName, createCachedTask, deleteTask, findCachedAnalysis, getAnalysisBackpressure, runAnalysisTask, sha1Article } from "./analysis-worker";
import { deductCallBalanceInTransaction } from "./billing";

const normalizeSearchModel = (value?: string): "none" | "gemini" | "gemini-lite" =>
	value === "gemini" || value === "gemini-lite" ? value : "none";

const terminalStatuses = new Set(["completed", "failed", "cancelled"]);
const activeTaskStatuses = ["pending", "processing"];

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
		const cached = await findCachedAnalysis(sha1, body.mode, modelName);
		if (cached?.article?.output?.result && cached.status !== "processing") {
			const taskId = await createCachedTask({ uid: user?.uid ?? null, articleText: body.articleText, mode: body.mode, modelId: body.modelId, fingerprint: body.fingerprint, sha1, resultId: cached._id.toString() });
			return { success: true, taskId };
		}

		const activeTaskCount = await countActiveTasksForSubmitter(user?.uid ?? null, body.fingerprint);
		if (activeTaskCount >= env.analysisMaxActiveTasksPerUser)
			return { success: false, error: `最多只能同时创建 ${env.analysisMaxActiveTasksPerUser} 个进行中的分析任务，请等待已有任务完成` };

		const taskId = new ObjectId();
		const createdAt = new Date().toISOString();
		let deductedFrom: "grant" | "paid" | null = null;
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
						metadata: { sha1, fingerprint: body.fingerprint, modelName, session: "pending" },
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
				if ((error as Error).message === "INSUFFICIENT_BALANCE")
					return { success: false, error: "调用次数不足，请前往计费管理页面充值或兑换订单" };
				throw error;
			}
			writeAuditLog({ event: "billing_deducted", uid: user.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { taskId: taskId.toString(), deductedFrom } });
		} else {
			await insertOne(COLLECTIONS.analysisTasks, {
				_id: taskId,
				uid: user?.uid ?? null,
				status: "pending",
				input: body,
				metadata: { sha1, fingerprint: body.fingerprint, modelName, session: "pending" },
				billing: {
					deducted: false,
					deductedFrom: null,
				},
				progress: createProgress("queued", "任务已创建，等待后台处理", 5),
				createdAt,
				updatedAt: createdAt,
			});
		}
		runAnalysisTask(taskId, {
			uid: user?.uid ?? null,
			modelId: body.modelId,
			articleText: body.articleText,
			mode: body.mode,
			fingerprint: body.fingerprint,
			searchModel: normalizeSearchModel(body.searchModel),
			isPremium: model.premium === true,
		});
		return {
			success: true,
			taskId: taskId.toString(),
			status: "pending",
			progress: createProgress("queued", "任务已创建，等待后台处理", 5),
		};
	}, {
		body: t.Object({
			articleText: t.String({ minLength: 1, maxLength: env.analysisMaxArticleChars }),
			mode: t.String({ minLength: 1, maxLength: env.analysisMaxModeChars }),
			modelId: t.String({ minLength: 1, maxLength: 128 }),
			fingerprint: t.String({ minLength: 1, maxLength: env.analysisMaxFingerprintChars }),
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
