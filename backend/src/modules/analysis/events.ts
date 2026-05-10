import { ObjectId } from "mongodb";
import { COLLECTIONS, findOne } from "../../db/mongo";
import { createTaskSnapshot } from "./records";

const terminalStatuses = new Set(["completed", "failed", "cancelled"]);

/**
 * 创建分析任务的 Server-Sent Events (SSE) 流
 * 定期轮询任务状态并推送快照，直到任务完成或失败
 * @param taskId - 任务 ID
 * @param request - HTTP 请求对象，用于监听客户端断开
 * @returns SSE 响应流
 */
export const createAnalysisTaskEventStream = (taskId: ObjectId, request: Request) => {
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
};

