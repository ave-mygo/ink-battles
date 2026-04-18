import type { AuthUser } from "../types";
import { COLLECTIONS, findOne } from "../db/mongo";
import { verifyAuthToken } from "../utils/crypto";

const BEARER_PREFIX_REGEX = /^Bearer\s+/i;

export const getCookie = (headers: Headers, name: string) => {
	const cookie = headers.get("cookie") ?? "";
	return cookie
		.split(";")
		.map(item => item.trim())
		.find(item => item.startsWith(`${name}=`))
		?.slice(name.length + 1);
};

export const getCurrentUser = async (headers: Headers): Promise<AuthUser | null> => {
	const token = getCookie(headers, "auth-token") ?? headers.get("authorization")?.replace(BEARER_PREFIX_REGEX, "");
	const uid = await verifyAuthToken(token);
	if (!uid)
		return null;
	return findOne<AuthUser>(COLLECTIONS.users, { uid });
};

export const requireUser = async (headers: Headers) => {
	const user = await getCurrentUser(headers);
	if (!user)
		throw new Error("UNAUTHORIZED");
	return user;
};
