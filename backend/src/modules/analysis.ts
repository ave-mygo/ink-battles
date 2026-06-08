import type { AnalysisRuntimeSetting } from "@ink-battles/shared/types/common";
import type { AnalysisTaskPool, SearchModel } from "./analysis/types";
import { Elysia, t } from "elysia";
import { ObjectId } from "mongodb";
import { COLLECTIONS, count, findOne, insertOne, isObjectId, objectId, updateOne, withTransaction } from "../db/mongo";
import { getCurrentUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { createProgress } from "./analysis-progress";
import { canAcceptAnalysisTask, cancelRunningTask, deleteTask, getAnalysisBackpressure, releaseAnalysisTaskSlot, reserveAnalysisTaskSlot, runAnalysisTask, sha1Article } from "./analysis-worker";
import { cleanModelName, createCachedTask, findCachedAnalysis } from "./analysis/cache";
import { createAnalysisTaskEventStream } from "./analysis/events";
import { createTaskSnapshot, getAnalysisTaskResult } from "./analysis/records";
import { deductCallBalanceInTransaction, hasDonatedAccount } from "./billing";
import { getCachedEffectiveGradingModelById, getSiteSettingValue } from "./site-settings";

const validSearchModels = new Set<SearchModel>(["none", "gemini", "gemini-lite", "ds-search"]);

/**
 * 标准化搜索模型参数
 * @param value - 原始搜索模型字符串
 * @returns 标准化后的搜索模型类型
 */
function normalizeSearchModel(value?: string): SearchModel {
  return value && validSearchModels.has(value as SearchModel) ? value as SearchModel : "none";
}

const activeTaskStatuses = ["pending", "processing"];

/**
 * 统计提交者当前活跃的任务数量
 * @param uid - 用户 ID，null 表示游客
 * @param fingerprint - 游客指纹
 * @returns 活跃任务数量
 */
function countActiveTasksForSubmitter(uid: number | null, fingerprint: string) {
  return count(COLLECTIONS.analysisTasks, uid
    ? { uid, status: { $in: activeTaskStatuses } }
    : { "uid": null, "metadata.fingerprint": fingerprint, "status": { $in: activeTaskStatuses } });
}

/**
 * 获取队列已满时的提示消息
 * @param pool - 任务池类型
 * @returns 提示消息字符串
 */
function getQueueFullMessage(pool: AnalysisTaskPool, analysisConfig: AnalysisRuntimeSetting) {
  return pool === "sponsor"
    ? `赞助者分析任务池已满，最多允许 ${analysisConfig.max_sponsor_queued_tasks} 个任务排队，请稍后再试`
    : `免费/游客分析任务池已满，最多允许 ${analysisConfig.max_queued_tasks} 个任务排队，请稍后再试`;
}

export const analysisModule = new Elysia()
  .post("/api/v2/analysis/tasks", async ({ request, body }) => {
    const analysisConfig = await getSiteSettingValue("analysis.runtime");
    console.log(`[analysis:submit] mode="${body.mode}" modelId="${body.modelId}" searchModel="${body.searchModel ?? "none"}" articleLength=${body.articleText?.length ?? 0}`);
    if (!body.articleText)
      return { success: false, error: "文章内容不能为空" };
    if (body.articleText.length > analysisConfig.max_article_chars)
      return { success: false, error: `文章内容超过 ${analysisConfig.max_article_chars.toLocaleString()} 字限制` };
    if (body.mode.length > analysisConfig.max_mode_chars)
      return { success: false, error: "分析模式字段过长" };
    if (body.fingerprint.length > analysisConfig.max_fingerprint_chars)
      return { success: false, error: "浏览器指纹字段过长" };

    const model = getCachedEffectiveGradingModelById(body.modelId);
    if (!model)
      return { success: false, error: "无效的评分模型" };

    const user = await getCurrentUser(request.headers);
    const isSponsor = user ? await hasDonatedAccount(user.uid) : false;
    if (model.premium) {
      if (!user)
        return { success: false, error: "会员模型需要登录后使用，请先登录" };
      if (!isSponsor)
        return { success: false, error: "会员模型仅限赞助会员使用，请先开通会员后再提交分析" };
    }
    const pool: AnalysisTaskPool = isSponsor ? "sponsor" : "standard";
    const sha1 = sha1Article(body.articleText);
    const modelName = cleanModelName(model.model);
    const normalizedSearchModel = normalizeSearchModel(body.searchModel);
    const cached = await findCachedAnalysis(sha1, body.mode, modelName, normalizedSearchModel);
    if (cached?.article?.output?.result && cached.status !== "processing") {
      const taskId = await createCachedTask({
        uid: user?.uid ?? null,
        articleText: body.articleText,
        mode: body.mode,
        modelId: body.modelId,
        fingerprint: body.fingerprint,
        sha1,
        searchModel: normalizedSearchModel,
        resultId: cached._id.toString(),
      });
      return { success: true, taskId };
    }

    const activeTaskCount = await countActiveTasksForSubmitter(user?.uid ?? null, body.fingerprint);
    if (activeTaskCount >= analysisConfig.max_active_tasks_per_user)
      return { success: false, error: `最多只能同时创建 ${analysisConfig.max_active_tasks_per_user} 个进行中的分析任务，请等待已有任务完成` };
    if (!canAcceptAnalysisTask(pool)) {
      console.warn("[analysis:submit] rejected by backpressure", { pool, ...getAnalysisBackpressure() });
      return { success: false, error: getQueueFullMessage(pool, analysisConfig) };
    }
    if (!reserveAnalysisTaskSlot(pool)) {
      console.warn("[analysis:submit] rejected by reserved backpressure", getAnalysisBackpressure());
      return { success: false, error: getQueueFullMessage(pool, analysisConfig) };
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
            releaseAnalysisTaskSlot(pool);
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
        pool,
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
      releaseAnalysisTaskSlot(pool);
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
      articleText: t.String({ minLength: 1 }),
      mode: t.String({ minLength: 1 }),
      modelId: t.String({ minLength: 1, maxLength: 128 }),
      fingerprint: t.String({ minLength: 1 }),
      searchModel: t.Optional(t.String({ enum: ["none", "gemini", "gemini-lite", "ds-search"] })),
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
    return getAnalysisTaskResult(params.taskId);
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
    return createAnalysisTaskEventStream(taskId, request);
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
