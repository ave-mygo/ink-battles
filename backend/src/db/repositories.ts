import type { UserBilling } from "@ink-battles/shared/types/database/user_billing";
import type { AuthUser } from "@ink-battles/shared/types/users/user";
import { COLLECTIONS, count, findMany, findOne, findOneAndUpdate, insertOne, updateOne } from "./mongo";

/**
 * 根据用户 UID 查询用户信息
 * @param uid - 用户唯一标识符
 * @returns 用户信息或 null
 */
export const getUserByUid = (uid: number) => findOne<AuthUser>(COLLECTIONS.users, { uid });

/**
 * 根据邮箱查询用户信息
 * @param email - 用户邮箱地址
 * @returns 用户信息或 null
 */
export const getUserByEmail = (email: string) => findOne<AuthUser>(COLLECTIONS.users, { email });

/**
 * 根据 QQ OpenID 查询用户信息
 * @param qqOpenid - QQ 开放平台的 OpenID
 * @returns 用户信息或 null
 */
export const getUserByQQ = (qqOpenid: string) => findOne<AuthUser>(COLLECTIONS.users, { qqOpenid });

/**
 * 根据爱发电用户 ID 查询用户信息
 * @param afdId - 爱发电用户 ID
 * @returns 用户信息或 null
 */
export const getUserByAfdian = (afdId: string) => findOne<AuthUser>(COLLECTIONS.users, { afdId });

/**
 * 更新用户信息
 * @param uid - 用户唯一标识符
 * @param data - 要更新的用户数据（部分字段）
 * @returns 是否更新成功
 */
export const updateUser = (uid: number, data: Partial<AuthUser> | Record<string, unknown>) => updateOne<AuthUser>(COLLECTIONS.users, { uid }, data as Partial<AuthUser>);

/**
 * 生成下一个可用的用户 UID
 * @returns 新的用户 UID（从 10001 开始递增）
 */
export async function generateNextUID() {
  const users = await findMany<AuthUser>(COLLECTIONS.users, {}, { sort: { uid: -1 }, limit: 1 });
  return (users[0]?.uid ?? 10000) + 1;
}

/**
 * 创建新用户
 * @param user - 完整的用户信息对象
 * @returns 是否创建成功
 */
export const createUser = (user: AuthUser) => insertOne<AuthUser>(COLLECTIONS.users, user);

/**
 * 根据用户 UID 查询计费信息
 * @param uid - 用户唯一标识符
 * @returns 用户计费信息或 null
 */
export const getUserBilling = (uid: number) => findOne<UserBilling>(COLLECTIONS.userBilling, { uid });

/**
 * 更新用户计费信息
 * @param uid - 用户唯一标识符
 * @param data - 要更新的计费数据（部分字段）
 * @returns 是否更新成功
 */
export const updateBilling = (uid: number, data: Partial<UserBilling>) => updateOne<UserBilling>(COLLECTIONS.userBilling, { uid }, data);

/**
 * 原子性更新用户计费信息（支持复杂查询条件和更新操作）
 * @param filter - 查询过滤条件
 * @param update - 更新操作（支持 MongoDB 更新操作符）
 * @returns 更新后的计费信息或 null
 */
export function atomicBillingUpdate(filter: Record<string, unknown>, update: Record<string, unknown>) {
  return findOneAndUpdate<UserBilling>(COLLECTIONS.userBilling, filter, update as never);
}

/**
 * 统计分析请求记录数量
 * @param filter - 查询过滤条件
 * @returns 符合条件的记录数量
 */
export const countAnalysisRecords = (filter: Record<string, unknown>) => count(COLLECTIONS.analysisRequests, filter);
