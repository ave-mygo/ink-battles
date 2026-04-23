import { collection, ensureCollectionExists } from "./mongo";

type IndexKey = Record<string, 1 | -1>;
type IndexOptions = {
	name: string;
	unique?: boolean;
	sparse?: boolean;
	expireAfterSeconds?: number;
	partialFilterExpression?: Record<string, unknown>;
};

const sameIndexKey = (left: Record<string, unknown>, right: IndexKey) =>
	JSON.stringify(left) === JSON.stringify(right);

const ensureIndex = async (collectionName: string, key: IndexKey, options: IndexOptions) => {
	await ensureCollectionExists(collectionName);
	const target = await collection(collectionName);
	const existing = await target.listIndexes().toArray();
	const sameKeyIndex = existing.find(index => sameIndexKey(index.key as Record<string, unknown>, key));
	if (sameKeyIndex) {
		if (options.unique && sameKeyIndex.unique !== true) {
			throw new Error(`索引创建前检查失败：${collectionName}.${options.name} 已存在非唯一同键索引`);
		}
		return;
	}
	await target.createIndex(key, options);
};

const findDuplicateValues = async (collectionName: string, field: string) => {
	await ensureCollectionExists(collectionName);
	return (await collection(collectionName)).aggregate([
		{ $match: { [field]: { $nin: [null, ""] } } },
		{ $group: { _id: `$${field}`, count: { $sum: 1 } } },
		{ $match: { count: { $gt: 1 } } },
		{ $limit: 5 },
	]).toArray();
};

const assertNoDuplicates = async (collectionName: string, field: string) => {
	const duplicates = await findDuplicateValues(collectionName, field);
	if (duplicates.length > 0) {
		throw new Error(`索引创建前检查失败：${collectionName}.${field} 存在重复值`);
	}
};

const assertNoEmptyEmails = async () => {
	await ensureCollectionExists("users");
	const emptyEmailCount = await (await collection("users")).countDocuments({ email: "" });
	if (emptyEmailCount > 0) {
		throw new Error("索引创建前检查失败：users.email 存在空字符串");
	}
};

export const ensureBackendIndexes = async () => {
	await assertNoDuplicates("afd_orders", "orderNo");
	await assertNoDuplicates("users", "email");
	await assertNoEmptyEmails();

	await ensureIndex("afd_orders", { orderNo: 1 }, { unique: true, name: "uniq_afd_orders_orderNo" });
	await ensureIndex("users", { email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } }, name: "uniq_users_email_string" });
	await ensureIndex("sessions", { createdAt: 1 }, { expireAfterSeconds: 30 * 60, name: "ttl_sessions_createdAt" });
	await ensureIndex("email_verification_codes", { expiresAt: 1 }, { expireAfterSeconds: 60 * 60, name: "ttl_email_codes_expiresAt" });
	await ensureIndex("email_verification_codes", { email: 1, type: 1, used: 1 }, { name: "idx_email_codes_email_type_used" });
	await ensureIndex("rate_limits", { key: 1 }, { unique: true, name: "uniq_rate_limits_key" });
	await ensureIndex("rate_limits", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl_rate_limits_expiresAt" });
	await ensureIndex("auth_sessions", { sessionId: 1 }, { unique: true, name: "uniq_auth_sessions_sessionId" });
	await ensureIndex("auth_sessions", { uid: 1, revokedAt: 1, expiresAt: 1 }, { name: "idx_auth_sessions_uid_state" });
	await ensureIndex("auth_sessions", { expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl_auth_sessions_expiresAt" });
	await ensureIndex("audit_logs", { createdAt: 1 }, { name: "idx_audit_logs_createdAt" });
	await ensureIndex("analysis_requests", { uid: 1, timestamp: -1, _id: -1 }, { name: "idx_analysis_requests_uid_timestamp_desc" });
	await ensureIndex("analysis_requests", { "settings.public": 1, timestamp: -1, _id: -1 }, {
		name: "idx_analysis_requests_settings_public_timestamp_desc",
		partialFilterExpression: { "settings.public": true },
	});
};
