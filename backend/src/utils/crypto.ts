import process from "node:process";
import { jwtVerify, SignJWT } from "jose";
import md5 from "md5";
import { getConfig } from "../config";
import { isAuthSessionValid } from "./auth-sessions";

const sevenDays = 7 * 24 * 60 * 60;

const jwtSecret = () => new TextEncoder().encode(getConfig().jwt.secret);

export interface AuthTokenPayload {
	uid: number;
	sessionId: string;
}

export const signAuthToken = async (uid: number, sessionId: string) =>
	new SignJWT({ uid, sessionId })
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("7d")
		.sign(jwtSecret());

export const verifyAuthTokenPayload = async (token?: string | null): Promise<AuthTokenPayload | null> => {
	if (!token)
		return null;
	try {
		const { payload } = await jwtVerify(token, jwtSecret());
		if (typeof payload.uid !== "number" || typeof payload.sessionId !== "string")
			return null;
		if (!await isAuthSessionValid(payload.uid, payload.sessionId))
			return null;
		return { uid: payload.uid, sessionId: payload.sessionId };
	} catch {
		return null;
	}
};

export const verifyAuthToken = async (token?: string | null): Promise<number | null> =>
	(await verifyAuthTokenPayload(token))?.uid ?? null;

export const authCookie = (token: string) =>
	`auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sevenDays}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`;

export const clearAuthCookie = () => "auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

export const gravatarUrl = (email: string, uid: number) =>
	email ? `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=mp` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;
