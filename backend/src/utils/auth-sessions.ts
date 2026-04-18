import { randomUUID } from "node:crypto";
import { COLLECTIONS, findOne, insertOne, updateMany, updateOne } from "../db/mongo";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthSession {
	sessionId: string;
	uid: number;
	createdAt: Date;
	expiresAt: Date;
	revokedAt?: Date;
	userAgent?: string | null;
	ipHash?: string | null;
}

export const createAuthSession = async (uid: number, input: { userAgent?: string | null } = {}) => {
	const now = new Date();
	const session: AuthSession = {
		sessionId: randomUUID(),
		uid,
		createdAt: now,
		expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
		userAgent: input.userAgent ?? null,
	};
	await insertOne<AuthSession>(COLLECTIONS.authSessions, session);
	return session;
};

export const isAuthSessionValid = async (uid: number, sessionId: string) => {
	const session = await findOne<AuthSession>(COLLECTIONS.authSessions, {
		uid,
		sessionId,
		revokedAt: { $exists: false },
		expiresAt: { $gt: new Date() },
	});
	return !!session;
};

export const revokeAuthSession = (uid: number, sessionId: string) =>
	updateOne<AuthSession>(COLLECTIONS.authSessions, {
		uid,
		sessionId,
		revokedAt: { $exists: false },
	}, {
		$set: {
			revokedAt: new Date(),
		},
	});

export const revokeUserSessions = (uid: number) =>
	updateMany<AuthSession>(COLLECTIONS.authSessions, {
		uid,
		revokedAt: { $exists: false },
	}, {
		$set: {
			revokedAt: new Date(),
		},
	});
