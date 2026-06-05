import type { ClientSession, Document, Filter, FindOneAndUpdateOptions, FindOptions, OptionalUnlessRequiredId, UpdateFilter, WithId } from "mongodb";
import { MongoClient, ObjectId } from "mongodb";
import { getConfig } from "../config";

let cachedClient: MongoClient | null = null;
let connectingClient: Promise<MongoClient> | null = null;

const MONGO_URI_CREDENTIALS_REGEX = /\/\/([^:/?#]+):([^@/?#]+)@/u;

export const DB_NAME = "ink_battles";
export const COLLECTIONS = {
  analysisRequests: "analysis_requests",
  analysisTasks: "analysis_tasks",
  excellentSentences: "excellent_sentences",
  sentenceVectors: "sentence_vectors",
  userBilling: "user_billing",
  promoCodes: "promo_codes",
  promoCodeRedemptions: "promo_code_redemptions",
  afdOrders: "afd_orders",
  users: "users",
  afdUsers: "afd_users",
  sessions: "sessions",
  emailCodes: "email_verification_codes",
  inviteCodes: "invite_codes",
  rateLimits: "rate_limits",
  authSessions: "auth_sessions",
  auditLogs: "audit_logs",
  siteSettings: "site_settings",
  siteSettingChanges: "site_setting_changes",
} as const;

/**
 * 将字符串转换为 MongoDB ObjectId
 * @param id - ObjectId 字符串
 * @returns MongoDB ObjectId 对象
 */
export const objectId = (id: string) => new ObjectId(id);

/**
 * 验证字符串是否为有效的 ObjectId 格式
 * @param id - 待验证的字符串
 * @returns 是否为有效的 ObjectId
 */
export const isObjectId = (id: string) => ObjectId.isValid(id);

/**
 * 脱敏 MongoDB 连接字符串，隐藏密码信息
 * @param uri - 原始 MongoDB 连接字符串
 * @returns 脱敏后的连接字符串
 */
export function redactMongoUri(uri: string) {
  return uri.replace(MONGO_URI_CREDENTIALS_REGEX, "//$1:***@");
}

/**
 * 获取 MongoDB 客户端实例（单例模式，支持连接复用）
 * @returns MongoDB 客户端实例
 */
export async function mongoClient() {
  if (cachedClient)
    return cachedClient;
  if (connectingClient)
    return connectingClient;

  const { mongodb } = getConfig();
  const directConnection = mongodb.directConnection !== false;
  const credential = mongodb.user && mongodb.password ? `${mongodb.user}:${mongodb.password}@` : "";
  const uri = `mongodb://${credential}${mongodb.host}:${mongodb.port}/?directConnection=${directConnection}`;

  connectingClient = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  }).connect().catch((error) => {
    console.error(`[mongo] 连接失败 uri=${redactMongoUri(uri)}`, error);
    throw error;
  });

  cachedClient = await connectingClient;
  return cachedClient;
}

/**
 * 获取指定名称的 MongoDB 集合
 * @param name - 集合名称
 * @returns MongoDB 集合对象
 */
export async function collection<T extends Document = Document>(name: string) {
  const client = await mongoClient();
  return client.db(DB_NAME).collection<T>(name);
}

/**
 * 确保集合存在，如果不存在则创建
 * @param name - 集合名称
 */
export async function ensureCollectionExists(name: string) {
  const client = await mongoClient();
  const database = client.db(DB_NAME);
  const existed = await database.listCollections({ name }, { nameOnly: true }).hasNext();
  if (!existed) {
    await database.createCollection(name);
  }
}

/**
 * 查询单个文档
 * @param name - 集合名称
 * @param filter - 查询过滤条件
 * @returns 查询到的文档或 null
 */
export async function findOne<T extends Document>(name: string, filter: Filter<T>) {
  return (await collection<T>(name)).findOne(filter);
}

/**
 * 查询多个文档
 * @param name - 集合名称
 * @param filter - 查询过滤条件
 * @param options - 查询选项（排序、分页等）
 * @returns 文档数组
 */
export async function findMany<T extends Document>(name: string, filter: Filter<T>, options: FindOptions = {}) {
  return (await collection<T>(name)).find(filter, options).toArray();
}

/**
 * 插入单个文档
 * @param name - 集合名称
 * @param data - 要插入的文档数据
 * @param session - 可选的事务会话
 * @returns 是否插入成功
 */
export async function insertOne<T extends Document>(name: string, data: OptionalUnlessRequiredId<T>, session?: ClientSession) {
  await (await collection<T>(name)).insertOne(data, session ? { session } : undefined);
  return true;
}

/**
 * 更新单个文档
 * @param name - 集合名称
 * @param filter - 查询过滤条件
 * @param data - 更新数据（支持 MongoDB 更新操作符或部分字段）
 * @param session - 可选的事务会话
 * @returns 是否更新成功（匹配或修改了文档）
 */
export async function updateOne<T extends Document>(name: string, filter: Filter<T>, data: UpdateFilter<T> | Partial<T>, session?: ClientSession) {
  const update = Object.keys(data).some(key => key.startsWith("$")) ? data : { $set: data };
  const result = await (await collection<T>(name)).updateOne(filter, update as UpdateFilter<T>, session ? { session } : undefined);
  return result.modifiedCount > 0 || result.matchedCount > 0;
}

/**
 * 更新多个文档
 * @param name - 集合名称
 * @param filter - 查询过滤条件
 * @param data - 更新数据（支持 MongoDB 更新操作符或部分字段）
 * @param session - 可选的事务会话
 * @returns 修改的文档数量
 */
export async function updateMany<T extends Document>(name: string, filter: Filter<T>, data: UpdateFilter<T> | Partial<T>, session?: ClientSession) {
  const update = Object.keys(data).some(key => key.startsWith("$")) ? data : { $set: data };
  const result = await (await collection<T>(name)).updateMany(filter, update as UpdateFilter<T>, session ? { session } : undefined);
  return result.modifiedCount;
}

/**
 * 查找并更新单个文档（原子操作）
 * @param name - 集合名称
 * @param filter - 查询过滤条件
 * @param update - 更新操作
 * @param options - 更新选项
 * @returns 更新后的文档或 null
 */
export async function findOneAndUpdate<T extends Document>(name: string, filter: Filter<T>, update: UpdateFilter<T>, options: FindOneAndUpdateOptions = {}) {
  return (await collection<T>(name)).findOneAndUpdate(filter, update, { returnDocument: "after", ...options }) as Promise<WithId<T> | null>;
}

/**
 * 删除单个文档
 * @param name - 集合名称
 * @param filter - 查询过滤条件
 * @returns 是否删除成功
 */
export async function deleteOne<T extends Document>(name: string, filter: Filter<T>) {
  return (await collection<T>(name)).deleteOne(filter).then(result => result.deletedCount > 0);
}

/**
 * 统计文档数量
 * @param name - 集合名称
 * @param filter - 查询过滤条件
 * @returns 符合条件的文档数量
 */
export async function count<T extends Document>(name: string, filter: Filter<T>) {
  return (await collection<T>(name)).countDocuments(filter);
}

/**
 * 创建 TTL 索引（自动过期索引）
 * @param name - 集合名称
 * @param field - 索引字段名
 * @param expireAfterSeconds - 过期时间（秒）
 */
export async function ensureTtlIndex(name: string, field: string, expireAfterSeconds: number) {
  await (await collection(name)).createIndex({ [field]: 1 }, { expireAfterSeconds });
}

/**
 * 在事务中执行操作
 * @param callback - 事务回调函数，接收会话对象
 * @returns 回调函数的返回值
 */
export async function withTransaction<T>(callback: (session: ClientSession) => Promise<T>) {
  const client = await mongoClient();
  const session = client.startSession();
  try {
    let value!: T;
    await session.withTransaction(async () => {
      value = await callback(session);
    });
    return value;
  } finally {
    await session.endSession();
  }
}
