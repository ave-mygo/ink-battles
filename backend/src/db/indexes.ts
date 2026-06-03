import { collection, ensureCollectionExists } from "./mongo";

type IndexKey = Record<string, 1 | -1>;
interface IndexOptions {
  name: string;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
}

/**
 * 判断两个索引键是否相同
 * @param left - 第一个索引键对象
 * @param right - 第二个索引键对象
 * @returns 两个索引键是否完全相同
 */
function sameIndexKey(left: Record<string, unknown>, right: IndexKey) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * 确保索引存在，如果不存在则创建；如存在冲突则处理（删除非唯一索引后重建）
 * @param collectionName - 集合名称
 * @param key - 索引键定义
 * @param options - 索引选项
 */
async function ensureIndex(collectionName: string, key: IndexKey, options: IndexOptions) {
  await ensureCollectionExists(collectionName);
  const target = await collection(collectionName);
  const existing = await target.listIndexes().toArray();
  const sameKeyIndex = existing.find(index => sameIndexKey(index.key as Record<string, unknown>, key));
  if (sameKeyIndex) {
    if (options.unique && sameKeyIndex.unique !== true) {
      throw new Error(`索引创建前检查失败：${collectionName}.${options.name} 已存在非唯一同键索引`);
    }
    if (!options.unique && sameKeyIndex.unique === true && typeof sameKeyIndex.name === "string") {
      await target.dropIndex(sameKeyIndex.name);
      await target.createIndex(key, options);
    }
    return;
  }
  await target.createIndex(key, options);
}

/**
 * 查找指定字段的重复值（最多返回 5 条）
 * @param collectionName - 集合名称
 * @param field - 要检查的字段名
 * @returns 重复值列表
 */
async function findDuplicateValues(collectionName: string, field: string) {
  await ensureCollectionExists(collectionName);
  return (await collection(collectionName)).aggregate([
    { $match: { [field]: { $nin: [null, ""] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 5 },
  ]).toArray();
}

/**
 * 断言指定字段不存在重复值，否则抛出错误
 * @param collectionName - 集合名称
 * @param field - 要检查的字段名
 */
async function assertNoDuplicates(collectionName: string, field: string) {
  const duplicates = await findDuplicateValues(collectionName, field);
  if (duplicates.length > 0) {
    throw new Error(`索引创建前检查失败：${collectionName}.${field} 存在重复值`);
  }
}

/**
 * 断言用户集合中不存在空字符串邮箱，否则抛出错误
 */
async function assertNoEmptyEmails() {
  await ensureCollectionExists("users");
  const emptyEmailCount = await (await collection("users")).countDocuments({ email: "" });
  if (emptyEmailCount > 0) {
    throw new Error("索引创建前检查失败：users.email 存在空字符串");
  }
}

/**
 * 确保后端所需的所有 MongoDB 索引都已创建
 * 包含订单、优惠码、用户、会话、邮箱验证码、限流、审计日志、分析请求等集合的索引
 * 会先进行数据一致性检查，发现重复值或空值则抛出错误
 */
export async function ensureBackendIndexes() {
  await assertNoDuplicates("afd_orders", "orderNo");
  await assertNoDuplicates("users", "email");
  await assertNoEmptyEmails();

  await ensureIndex("afd_orders", { orderNo: 1 }, { unique: true, name: "uniq_afd_orders_orderNo" });
  await ensureIndex("promo_codes", { code: 1 }, { unique: true, name: "uniq_promo_codes_code" });
  await ensureIndex("promo_codes", { active: 1, startsAt: 1, endsAt: 1, scope: 1 }, { name: "idx_promo_codes_active_window_scope" });
  await ensureIndex("promo_code_redemptions", { code: 1, uid: 1 }, { name: "idx_promo_code_redemptions_code_uid" });
  await ensureIndex("promo_code_redemptions", { uid: 1, redeemedAt: -1 }, { name: "idx_promo_code_redemptions_uid_redeemedAt" });
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
  await ensureIndex("analysis_requests", { "settings.public": 1, "timestamp": -1, "_id": -1 }, {
    name: "idx_analysis_requests_settings_public_timestamp_desc",
    partialFilterExpression: { "settings.public": true },
  });
  await ensureIndex("excellent_sentences", { normalizedContent: 1 }, { unique: true, name: "uniq_excellent_sentences_normalizedContent" });
  await ensureIndex("excellent_sentences", { uid: 1, createdAt: -1 }, { name: "idx_excellent_sentences_uid_createdAt" });
  await ensureIndex("excellent_sentences", { sourceArticleId: 1, uid: 1 }, { name: "idx_excellent_sentences_sourceArticleId_uid" });
  await ensureIndex("excellent_sentences", { reviewStatus: 1, recommendationStatus: 1, displayStatus: 1, createdAt: -1 }, { name: "idx_excellent_sentences_public_workflow" });
}
