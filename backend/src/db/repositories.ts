import type { AuthUser, UserBilling } from "../types";
import { COLLECTIONS, count, findMany, findOne, findOneAndUpdate, insertOne, updateOne } from "./mongo";

export const getUserByUid = (uid: number) => findOne<AuthUser>(COLLECTIONS.users, { uid });
export const getUserByEmail = (email: string) => findOne<AuthUser>(COLLECTIONS.users, { email });
export const getUserByQQ = (qqOpenid: string) => findOne<AuthUser>(COLLECTIONS.users, { qqOpenid });
export const getUserByAfdian = (afdId: string) => findOne<AuthUser>(COLLECTIONS.users, { afdId });
export const updateUser = (uid: number, data: Partial<AuthUser> | Record<string, unknown>) => updateOne<AuthUser>(COLLECTIONS.users, { uid }, data as Partial<AuthUser>);

export const generateNextUID = async () => {
	const users = await findMany<AuthUser>(COLLECTIONS.users, {}, { sort: { uid: -1 }, limit: 1 });
	return (users[0]?.uid ?? 10000) + 1;
};

export const createUser = (user: AuthUser) => insertOne<AuthUser>(COLLECTIONS.users, user);

export const getUserBilling = (uid: number) => findOne<UserBilling>(COLLECTIONS.userBilling, { uid });
export const updateBilling = (uid: number, data: Partial<UserBilling>) => updateOne<UserBilling>(COLLECTIONS.userBilling, { uid }, data);
export const atomicBillingUpdate = (filter: Record<string, unknown>, update: Record<string, unknown>) =>
	findOneAndUpdate<UserBilling>(COLLECTIONS.userBilling, filter, update as never);

export const countAnalysisRecords = (filter: Record<string, unknown>) => count(COLLECTIONS.analysisRequests, filter);
