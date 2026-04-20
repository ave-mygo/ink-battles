import crypto from "node:crypto";
import { COLLECTIONS, ensureCollectionExists, findOneAndUpdate } from "../db/mongo";
import { env } from "../env";
import { getCurrentUser } from "./auth";
import { normalizeEmail } from "../utils/validators";
import { getRequestIp } from "../utils/request";

interface RateLimitRecord {
	key: string;
	count: number;
	windowStart: Date;
	expiresAt: Date;
}

interface RateLimitRule {
	name: string;
	limit: number;
	windowMs: number;
	key: (request: Request, body: Record<string, unknown>) => Promise<string | null> | string | null;
}

const ONE_MINUTE_MS = 60 * 1000;
const FIVE_HOURS_MS = 5 * 60 * ONE_MINUTE_MS;

const hashPart = (value: string) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);

const readJsonBody = async (request: Request) => {
	try {
		const contentType = request.headers.get("content-type") || "";
		if (!contentType.includes("application/json"))
			return {};
		const contentLength = Number(request.headers.get("content-length") || 0);
		if (Number.isFinite(contentLength) && contentLength > env.maxJsonBodyBytes)
			throw new Error("PAYLOAD_TOO_LARGE");
		const body = await request.clone().json();
		return typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
	} catch {
		return {};
	}
};

const normalizeIp = (request: Request) => getRequestIp(request) || "unknown";

const pathMatches = (request: Request, path: string) =>
	new URL(request.url).pathname === path;

const createBucketKey = (ruleName: string, rawKey: string, windowMs: number) => {
	const bucket = Math.floor(Date.now() / windowMs);
	return `${ruleName}:${bucket}:${hashPart(rawKey)}`;
};

const isNamespaceNotFound = (error: unknown) =>
	typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 26;

const incrementRateLimit = async (key: string, windowStart: Date, windowMs: number, now: Date) =>
	findOneAndUpdate<RateLimitRecord>(COLLECTIONS.rateLimits, { key }, {
		$inc: { count: 1 },
		$setOnInsert: {
			key,
			windowStart,
			expiresAt: new Date(windowStart.getTime() + windowMs + ONE_MINUTE_MS),
		},
		$set: { updatedAt: now },
	}, { upsert: true, returnDocument: "after" });

const consumeRateLimit = async (rule: RateLimitRule, request: Request, body: Record<string, unknown>) => {
	const rawKey = await rule.key(request, body);
	if (!rawKey)
		return;
	const now = new Date();
	const key = createBucketKey(rule.name, rawKey, rule.windowMs);
	const windowStart = new Date(Math.floor(Date.now() / rule.windowMs) * rule.windowMs);
	let record: RateLimitRecord | null = null;
	try {
		record = await incrementRateLimit(key, windowStart, rule.windowMs, now);
	} catch (error) {
		if (!isNamespaceNotFound(error))
			throw error;
		await ensureCollectionExists(COLLECTIONS.rateLimits);
		record = await incrementRateLimit(key, windowStart, rule.windowMs, now);
	}

	if ((record?.count ?? 0) > rule.limit)
		throw new Error("RATE_LIMITED");
};

const rulesForRequest = (request: Request): RateLimitRule[] => {
	if (pathMatches(request, "/api/v2/rpc/auth.login")) {
		return [{
			name: "login",
			limit: 5,
			windowMs: ONE_MINUTE_MS,
			key: (currentRequest, body) => `${normalizeIp(currentRequest)}:${normalizeEmail(body.email)}`,
		}];
	}

	if (pathMatches(request, "/api/v2/rpc/auth.sendVerificationCode")) {
		return [{
			name: "verification_ip",
			limit: 3,
			windowMs: ONE_MINUTE_MS,
			key: currentRequest => normalizeIp(currentRequest),
		}, {
			name: "verification_email",
			limit: 3,
			windowMs: ONE_MINUTE_MS,
			key: (_currentRequest, body) => normalizeEmail(body.email),
		}];
	}

	if (pathMatches(request, "/api/v2/rpc/auth.sendPasswordResetCode")) {
		return [{
			name: "password_reset",
			limit: 3,
			windowMs: ONE_MINUTE_MS,
			key: (currentRequest, body) => `${normalizeIp(currentRequest)}:${normalizeEmail(body.email)}`,
		}];
	}

	if (pathMatches(request, "/api/v2/rpc/billing.redeemOrder")) {
		return [{
			name: "order_redeem",
			limit: 10,
			windowMs: ONE_MINUTE_MS,
			key: async currentRequest => {
				const user = await getCurrentUser(currentRequest.headers);
				return user ? String(user.uid) : null;
			},
		}];
	}

	if (pathMatches(request, "/api/v2/rpc/oauth.qqStart") || pathMatches(request, "/api/v2/rpc/oauth.afdianStart")) {
		return [{
			name: "oauth_start",
			limit: 10,
			windowMs: ONE_MINUTE_MS,
			key: currentRequest => normalizeIp(currentRequest),
		}];
	}

	if (pathMatches(request, "/api/v2/analysis/tasks")) {
		return [{
			name: "anonymous_analysis",
			limit: 5,
			windowMs: FIVE_HOURS_MS,
			key: async (currentRequest, body) => {
				const user = await getCurrentUser(currentRequest.headers);
				if (user)
					return null;
				const fingerprint = typeof body.fingerprint === "string" ? body.fingerprint.trim() : "missing";
				return `${normalizeIp(currentRequest)}:${fingerprint}`;
			},
		}];
	}

	return [];
};

export const assertRateLimit = async (request: Request) => {
	const rules = rulesForRequest(request);
	if (rules.length === 0)
		return;
	const body = await readJsonBody(request);
	for (const rule of rules) {
		await consumeRateLimit(rule, request, body);
	}
};
