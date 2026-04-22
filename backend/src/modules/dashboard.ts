import type { AuthUser } from "../types";
import { Elysia, t } from "elysia";
import { COLLECTIONS, deleteOne, findMany, findOne, isObjectId, objectId, updateOne } from "../db/mongo";
import { countAnalysisRecords } from "../db/repositories";
import { requireUser } from "../middleware/auth";
import { ok } from "../utils/response";

const HISTORY_SORT_FIELDS = {
	time: "createdAt",
	score: "article.output.overallScore",
} as const;

const normalizeHistorySortField = (sortBy?: string) =>
	sortBy === "score" ? HISTORY_SORT_FIELDS.score : HISTORY_SORT_FIELDS.time;

const normalizeHistorySortOrder = (sortOrder?: string) =>
	sortOrder === "asc" ? 1 : -1;

const normalizeHistoryVisibilityFilter = (visibility?: string) =>
	visibility === "public" || visibility === "private" ? visibility : "all";

const parseRecordResult = (record: Record<string, any>) => ({
	...record,
	_id: record._id?.toString(),
	createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
	updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
	settings: {
		...(record.settings ?? {}),
		public: record.isPublic === true,
	},
});

const viewableRecord = async (headers: Headers, id: string) => {
	if (!isObjectId(id))
		return null;
	const record = await findOne(COLLECTIONS.analysisRequests, { _id: objectId(id) });
	if (!record)
		return null;
	if (record.isPublic)
		return record;
	const user = await requireUser(headers);
	return record.uid === user.uid ? record : null;
};

export const dashboardModule = new Elysia()
	.get("/api/v2/analysis/history", async ({ request, query }) => {
		const user = await requireUser(request.headers);
		const page = Math.max(Number(query.page ?? 1), 1);
		const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 50);
		const sortField = normalizeHistorySortField(query.sortBy);
		const sortOrder = normalizeHistorySortOrder(query.sortOrder);
		const visibility = normalizeHistoryVisibilityFilter(query.visibility);
		const filter: Record<string, unknown> = { uid: user.uid };
		if (visibility === "public")
			filter.isPublic = true;
		else if (visibility === "private")
			filter.isPublic = { $ne: true };
		const [records, total] = await Promise.all([
			findMany(COLLECTIONS.analysisRequests, filter, {
				// 次排序固定回退到创建时间，避免同分记录在翻页时顺序抖动。
				sort: { [sortField]: sortOrder, createdAt: -1 },
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
	.get("/api/v2/analysis/share/:id", async ({ params }) => {
		if (!isObjectId(params.id))
			return { success: false, message: "记录不存在" };
		const record = await findOne(COLLECTIONS.analysisRequests, { _id: objectId(params.id), isPublic: true });
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
		await updateOne(COLLECTIONS.analysisRequests, { _id: objectId(params.id) }, { isPublic: body.isPublic, updatedAt: new Date() });
		return { success: true, message: body.isPublic ? "已公开分享" : "已取消公开" };
	}, { body: t.Object({ isPublic: t.Boolean() }), detail: { tags: ["REST: Analysis"] } })
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
