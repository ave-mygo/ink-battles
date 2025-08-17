"use server";

import { calculateAdvancedModelCalls, db_name, getUserType, USER_LIMITS, UserType } from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";
import { getUserSubscriptionData } from "@/lib/subscription";
import "server-only";

/**
 * 校验并消耗使用额度 - 支持用户分级
 * - 游客（未登录）：按配置的单次和每日限制
 * - 普通用户（已登录但未捐赠）：按配置的单次限制，无日累计限制
 * - 会员用户（已登录且已捐赠）：无单次和日累计限制，可使用高级模型
 * @returns 是否允许本次请求、提示信息和用户信息
 */
export const checkAndConsumeUsage = async (
	params: {
		userEmail: string | null;
		ip?: string | null;
		fingerprint?: string | null;
		textLength: number;
		isAdvancedModel?: boolean;
	},
): Promise<{
	allowed: boolean;
	message?: string;
	userType?: UserType;
	dailyAdvancedModelCalls?: number;
	remainingAdvancedModelCalls?: number;
}> => {
	const { userEmail, ip, fingerprint, textLength, isAdvancedModel = false } = params;
	const isLoggedIn = Boolean(userEmail);

	let donationAmount = 0;
	let userType = getUserType(isLoggedIn, donationAmount);

	if (isLoggedIn && userEmail) {
		try {
			const subscriptionData = await getUserSubscriptionData(userEmail);
			donationAmount = subscriptionData.subscription.totalAmount || 0;
			userType = getUserType(isLoggedIn, donationAmount);
		} catch (error) {
			console.warn("获取用户订阅信息失败，使用默认限制:", error);
		}
	}

	const limits = USER_LIMITS[userType];

	if (limits.perRequest && textLength > limits.perRequest) {
		return {
			allowed: false,
			message: `${userType === UserType.GUEST ? "游客" : userType === UserType.REGULAR ? "普通用户" : "会员"}单次分析上限为 ${limits.perRequest.toLocaleString()} 字`,
			userType,
		};
	}

	if (isAdvancedModel) {
		if (userType === UserType.GUEST || userType === UserType.REGULAR) {
			return {
				allowed: false,
				message: "高级模型需要会员权限，请先成为会员用户",
				userType,
			};
		}

		if (userType === UserType.MEMBER && donationAmount > 0) {
			const maxCalls = calculateAdvancedModelCalls(donationAmount);
			const dayKey = new Date().toISOString().slice(0, 10);
			const usageKey = { dayKey, type: "advanced_model", key: userEmail };

			const usageDoc = await db_find(db_name, "daily_usage", usageKey);
			const currentUsage = usageDoc?.used ?? 0;

			if (currentUsage >= maxCalls) {
				return {
					allowed: false,
					message: `今日高级模型调用次数已用完（${maxCalls}次），请明日再试或增加捐赠`,
					userType,
					dailyAdvancedModelCalls: maxCalls,
					remainingAdvancedModelCalls: 0,
				};
			}

			if (usageDoc) {
				await db_update(db_name, "daily_usage", usageKey, {
					used: currentUsage + 1,
					updatedAt: new Date(),
				});
			} else {
				await db_insert(db_name, "daily_usage", {
					...usageKey,
					used: 1,
					createdAt: new Date(),
				});
			}

			return {
				allowed: true,
				userType,
				dailyAdvancedModelCalls: maxCalls,
				remainingAdvancedModelCalls: maxCalls - currentUsage - 1,
			};
		}
	}

	if (userType === UserType.GUEST && limits.dailyLimit) {
		const dayKey = new Date().toISOString().slice(0, 10);
		const ipKey = ip ? { dayKey, type: "ip", key: ip } : null;
		const fpKey = fingerprint ? { dayKey, type: "fp", key: fingerprint } : null;

		const readCounter = async (key: { dayKey: string; type: string; key: string } | null): Promise<number> => {
			if (!key)
				return 0;
			const doc = await db_find(db_name, "daily_usage", key);
			return doc?.used ?? 0;
		};

		const ipUsed = await readCounter(ipKey);
		const fpUsed = await readCounter(fpKey);
		const existedMax = Math.max(ipUsed, fpUsed);

		if (existedMax + textLength > limits.dailyLimit) {
			return {
				allowed: false,
				message: `游客当日累计上限为 ${limits.dailyLimit.toLocaleString()} 字，请登录后继续使用`,
				userType,
			};
		}

		const incCounter = async (key: { dayKey: string; type: string; key: string } | null, delta: number) => {
			if (!key)
				return;
			const doc = await db_find(db_name, "daily_usage", key);
			if (doc) {
				await db_update(db_name, "daily_usage", key, {
					used: (doc.used ?? 0) + delta,
					updatedAt: new Date(),
				});
			} else {
				await db_insert(db_name, "daily_usage", {
					...key,
					used: delta,
					createdAt: new Date(),
				});
			}
		};

		await incCounter(ipKey, textLength);
		await incCounter(fpKey, textLength);
	}

	return {
		allowed: true,
		userType,
		...(userType === UserType.MEMBER && donationAmount > 0 && {
			dailyAdvancedModelCalls: calculateAdvancedModelCalls(donationAmount),
			remainingAdvancedModelCalls: calculateAdvancedModelCalls(donationAmount) - 0,
		}),
	};
};