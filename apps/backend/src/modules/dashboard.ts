import type { AuthUser } from "@ink-battles/shared/types/users/user";
import { Elysia, t } from "elysia";
import { COLLECTIONS, deleteOne, findMany, findOne, isObjectId, objectId, updateOne } from "../db/mongo";
import { countAnalysisRecords } from "../db/repositories";
import { requireUser } from "../middleware/auth";
import { ok } from "../utils/response";

/**
 * 构建可见记录的过滤条件
 * 过滤掉已隐藏的记录和已过期的记录
 * @returns 包含隐藏状态和过期时间的 MongoDB 查询过滤器
 */
function buildVisibleRecordFilter() {
  const now = new Date().toISOString();
  return {
    "privacy.hiddenAt": { $exists: false },
    "$or": [
      { "privacy.expiresAt": { $exists: false } },
      { "privacy.expiresAt": { $gt: now } },
    ],
  };
}

const HISTORY_SORT_FIELDS = {
  time: "timestamp",
  score: "article.output.overallScore",
} as const;

/**
 * 标准化历史记录排序字段
 * 将用户传入的排序字段映射到数据库实际字段
 * @param sortBy - 排序字段，可选值为 "time" 或 "score"
 * @returns 数据库中对应的字段名
 */
function normalizeHistorySortField(sortBy?: string) {
  return sortBy === "score" ? HISTORY_SORT_FIELDS.score : HISTORY_SORT_FIELDS.time;
}

/**
 * 标准化历史记录排序顺序
 * 将用户传入的排序顺序转换为 MongoDB 排序值
 * @param sortOrder - 排序顺序，可选值为 "asc" 或 "desc"
 * @returns MongoDB 排序值，1 表示升序，-1 表示降序
 */
function normalizeHistorySortOrder(sortOrder?: string) {
  return sortOrder === "asc" ? 1 : -1;
}

/**
 * 构建历史记录排序对象
 * 根据排序字段和顺序构建 MongoDB 排序对象，确保分页时顺序稳定
 * @param sortField - 排序字段名
 * @param sortOrder - 排序顺序，1 表示升序，-1 表示降序
 * @returns MongoDB 排序对象
 */
function buildHistorySort(sortField: string, sortOrder: 1 | -1) {
  /**
   * analysis_requests 实际落库的是 timestamp，而不是 createdAt。
   * 这里统一用 timestamp 排序，并在同值时回退到 _id，避免分页时顺序抖动。
   */
  if (sortField === HISTORY_SORT_FIELDS.time) {
    return { timestamp: sortOrder, _id: sortOrder } as const;
  }

  return {
    [sortField]: sortOrder,
    timestamp: -1,
    _id: -1,
  } as const;
}

const HISTORY_LIST_PROJECTION = {
  "article.input.articleText": 0,
  "article.input.search.searchResults": 0,
} as const;

/**
 * 标准化历史记录可见性过滤条件
 * 将用户传入的可见性值规范化为合法的枚举值
 * @param visibility - 可见性值，可选值为 "public"、"private" 或其他
 * @returns 规范化后的可见性值，非 "public" 或 "private" 时返回 "all"
 */
function normalizeHistoryVisibilityFilter(visibility?: string) {
  return visibility === "public" || visibility === "private" ? visibility : "all";
}

/**
 * 解析并格式化记录结果
 * 将数据库记录转换为 API 响应格式，处理 ObjectId、日期等特殊类型
 * @param record - 数据库原始记录对象
 * @returns 格式化后的记录对象，包含字符串化的 _id 和标准化的日期格式
 */
function parseRecordResult(record: Record<string, any>) {
  return {
    ...record,
    _id: record._id?.toString(),
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    settings: {
      ...(record.settings ?? {}),
      public: record.settings?.public === true,
    },
    privacy: {
      ...(record.privacy ?? {}),
    },
  };
}

/**
 * 获取用户可查看的记录
 * 校验记录的可访问性：公开记录任何人可查看，私有记录仅所有者可查看
 * @param headers - 请求头，用于身份验证
 * @param id - 记录的 ID
 * @returns 可查看的记录对象，无权访问或记录不存在时返回 null
 */
async function viewableRecord(headers: Headers, id: string) {
  if (!isObjectId(id))
    return null;
  const record = await findOne(COLLECTIONS.analysisRequests, { _id: objectId(id), ...buildVisibleRecordFilter() });
  if (!record)
    return null;
  if (record.settings?.public === true)
    return record;
  const user = await requireUser(headers);
  return record.uid === user.uid ? record : null;
}

export const dashboardModule = new Elysia()
  .get("/api/v2/analysis/history", async ({ request, query }) => {
    const user = await requireUser(request.headers);
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 50);
    const sortField = normalizeHistorySortField(query.sortBy);
    const sortOrder = normalizeHistorySortOrder(query.sortOrder);
    const visibility = normalizeHistoryVisibilityFilter(query.visibility);
    const sort = buildHistorySort(sortField, sortOrder);
    const filter: Record<string, unknown> = { uid: user.uid, ...buildVisibleRecordFilter() };
    if (visibility === "public")
      filter["settings.public"] = true;
    else if (visibility === "private")
      filter["settings.public"] = { $ne: true };
    const [records, total] = await Promise.all([
      findMany(COLLECTIONS.analysisRequests, filter, {
        projection: HISTORY_LIST_PROJECTION,
        sort,
        skip: (page - 1) * limit,
        limit,
      }),
      countAnalysisRecords(filter),
    ]);
    return ok({ records: records.map(parseRecordResult), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }, {
    query: t.Object({
      page: t.Optional(t.Union([t.String(), t.Number()])),
      limit: t.Optional(t.Union([t.String(), t.Number()])),
      sortBy: t.Optional(t.String({ enum: ["time", "score"] })),
      sortOrder: t.Optional(t.String({ enum: ["asc", "desc"] })),
      visibility: t.Optional(t.String({ enum: ["all", "public", "private"] })),
    }),
    detail: { tags: ["REST: Analysis"] },
  })
  .get("/api/v2/analysis/history/:id", async ({ request, params }) => {
    const record = await viewableRecord(request.headers, params.id);
    if (!record)
      return { success: false, message: "记录不存在或无权访问" };
    return ok({ record: parseRecordResult(record) });
  }, { detail: { tags: ["REST: Analysis"] } })
  .get("/api/v2/analysis/public-share-sitemap", async () => {
    const records = await findMany(COLLECTIONS.analysisRequests, {
      "settings.public": true,
      ...buildVisibleRecordFilter(),
    }, {
      projection: {
        _id: 1,
        timestamp: 1,
      },
      sort: {
        timestamp: -1,
        _id: -1,
      },
    });

    return ok({
      records: records.map((record) => {
        const normalizedRecord = record as Record<string, unknown>;
        const lastModified = normalizedRecord.timestamp instanceof Date
          ? normalizedRecord.timestamp.toISOString()
          : String(normalizedRecord.timestamp ?? new Date().toISOString());

        return {
          id: String(normalizedRecord._id),
          lastModified,
        };
      }),
    });
  }, { detail: { tags: ["REST: Analysis"] } })
  .get("/api/v2/analysis/share/:id", async ({ params }) => {
    if (!isObjectId(params.id))
      return { success: false, message: "记录不存在" };
    const record = await findOne(COLLECTIONS.analysisRequests, {
      "_id": objectId(params.id),
      "settings.public": true,
      ...buildVisibleRecordFilter(),
    });
    if (!record)
      return { success: false, message: "记录不存在或未公开" };
    return ok({ record: parseRecordResult(record) });
  }, { detail: { tags: ["REST: Analysis"] } })
  .patch("/api/v2/analysis/history/:id", async ({ request, params, body }) => {
    const user = await requireUser(request.headers);
    if (!isObjectId(params.id))
      return { success: false, message: "记录不存在" };
    const record = await findOne(COLLECTIONS.analysisRequests, { _id: objectId(params.id), uid: user.uid });
    if (!record)
      return { success: false, message: "记录不存在或无权访问" };
    await updateOne(COLLECTIONS.analysisRequests, { _id: objectId(params.id) }, { "settings.public": body.public });
    return { success: true, message: body.public ? "已公开分享" : "已取消公开" };
  }, { body: t.Object({ public: t.Boolean() }), detail: { tags: ["REST: Analysis"] } })
  .delete("/api/v2/analysis/history/:id", async ({ request, params }) => {
    const user = await requireUser(request.headers);
    if (!isObjectId(params.id))
      return { success: false, message: "记录不存在" };
    const deleted = await deleteOne(COLLECTIONS.analysisRequests, { _id: objectId(params.id), uid: user.uid });
    return { success: deleted, message: deleted ? "删除成功" : "记录不存在或无权访问" };
  }, { detail: { tags: ["REST: Analysis"] } })
  .post("/api/v2/rpc/profile.update", async ({ request, body }) => {
    const user = await requireUser(request.headers) as AuthUser;
    if (body.nickname && body.nickname.trim().length > 20)
      return { success: false, message: "昵称不能超过 20 个字符" };
    if (body.bio && body.bio.trim().length > 100)
      return { success: false, message: "签名不能超过 100 个字符" };
    await updateOne<AuthUser>(COLLECTIONS.users, { uid: user.uid }, { nickname: body.nickname?.trim() || null, bio: body.bio?.trim() || null, updatedAt: new Date() });
    return { success: true, message: "资料更新成功" };
  }, { body: t.Object({ nickname: t.Optional(t.String()), bio: t.Optional(t.String()) }), detail: { tags: ["RPC: Profile"] } });
