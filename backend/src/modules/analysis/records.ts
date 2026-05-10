import { getAnalysisConfig } from "../../config";
import { COLLECTIONS, findOne, findOneAndUpdate, isObjectId, objectId, updateOne } from "../../db/mongo";

/**
 * 从分析任务创建用于 SSE 推送的快照对象
 * @param task - 分析任务文档
 * @returns 快照数据对象
 */
export const createTaskSnapshot = (task: Record<string, any>) => ({
	success: true,
	status: task.status,
	error: task.error,
	resultId: task.resultId,
	progress: task.progress,
	validation: task.validation,
	createdAt: task.createdAt,
	updatedAt: task.updatedAt,
});

/**
 * 获取分析任务的最终结果
 * 若为游客记录，会激活或隐藏过期记录
 * @param taskId - 任务 ID 字符串
 * @returns 包含成功标志和结果数据的响应对象
 */
export const getAnalysisTaskResult = async (taskId: string) => {
	if (!isObjectId(taskId))
		return { success: false, message: "任务不存在" };
	const task = await findOne(COLLECTIONS.analysisTasks, { _id: objectId(taskId) });
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
};

const analysisConfig = getAnalysisConfig();
const GUEST_RESULT_TTL_MS = analysisConfig.guest_result_ttl_minutes * 60 * 1000;

/**
 * 判断记录是否为游客记录
 * @param record - 分析记录文档
 * @returns 是否为游客记录
 */
const isGuestRecord = (record: Record<string, any> | null) => record?.uid == null;

/**
 * 判断记录是否已被隐藏
 * @param record - 分析记录文档
 * @returns 是否已隐藏
 */
const isRecordHidden = (record: Record<string, any> | null) => typeof record?.privacy?.hiddenAt === "string";

/**
 * 判断游客记录是否已过期
 * @param record - 分析记录文档
 * @param now - 当前时间戳（毫秒），默认为当前时间
 * @returns 是否已过期
 */
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

/**
 * 将返回的分析记录转换为可安全序列化的对象
 * 处理 ObjectId、Date 等非 JSON 原生类型
 * @param record - 分析记录文档
 * @returns 可序列化的记录对象
 */
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

