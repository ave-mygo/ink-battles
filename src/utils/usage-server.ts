"use server";

import { consumeCall, getUserBilling } from "@/lib/billing";
import { db_name, getUserType, USER_LIMITS, UserType } from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";
import { getUserSubscriptionData } from "@/lib/subscription";
import "server-only";

/**
 * 校验并消耗使用额度 - 支持用户分级和浏览器指纹追踪
 * - 游客（未登录）：按配置的单次和每日限制，优先使用浏览器指纹追踪，IP作为备用
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
	grantCallsRemaining?: number;
	paidCallsRemaining?: number;
	usedCallType?: "grant" | "paid";
}> => {
	const { userEmail, ip, fingerprint, textLength, isAdvancedModel = false } = params;
	const isLoggedIn = Boolean(userEmail);

	let donationAmount = 0;
	let userType = getUserType(isLoggedIn, donationAmount);

	if (isLoggedIn && userEmail) {
		try {
			const subscriptionData = await getUserSubscriptionData(userEmail);
			donationAmount = subscriptionData.subscription.totalAmount || 0;

			// 如果用户是admin，直接赋予最高权限
			if (subscriptionData.user.admin) {
				userType = UserType.MEMBER;
				donationAmount = 999999; // 确保获得最高权限
			} else {
				userType = getUserType(isLoggedIn, donationAmount);
			}
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

		if (userType === UserType.MEMBER && donationAmount > 0 && userEmail) {
			const billing = await getUserBilling(userEmail);
			const totalCalls = billing.grantCallsRemaining + billing.paidCallsRemaining;

			if (totalCalls <= 0) {
				return {
					allowed: false,
					message: "高级模型调用次数已用完，请购买更多次数或等待下月赠送",
					userType,
					grantCallsRemaining: 0,
					paidCallsRemaining: 0,
				};
			}

			const consumeResult = await consumeCall(userEmail);
			if (!consumeResult.success) {
				return {
					allowed: false,
					message: "调用次数消耗失败，请重试",
					userType,
				};
			}

			const updatedBilling = await getUserBilling(userEmail);
			return {
				allowed: true,
				userType,
				grantCallsRemaining: updatedBilling.grantCallsRemaining,
				paidCallsRemaining: updatedBilling.paidCallsRemaining,
				usedCallType: consumeResult.callType === "none" ? undefined : consumeResult.callType,
			};
		}
	}

	if (userType === UserType.GUEST && limits.dailyLimit) {
		const dayKey = new Date().toISOString().slice(0, 10);

		// 优先使用浏览器指纹，IP作为备用标识
		const primaryKey = fingerprint ? { dayKey, type: "fp", key: fingerprint } : null;
		const fallbackKey = ip ? { dayKey, type: "ip", key: ip } : null;

		const readCounter = async (key: { dayKey: string; type: string; key: string } | null): Promise<number> => {
			if (!key)
				return 0;
			const doc = await db_find(db_name, "daily_usage", key);
			return doc?.used ?? 0;
		};

		// 检查使用量：优先检查指纹，如果没有指纹则检查IP
		let currentUsed = 0;
		let activeKey = null;

		if (primaryKey) {
			currentUsed = await readCounter(primaryKey);
			activeKey = primaryKey;

			// 如果有指纹但没有记录，检查是否有IP记录需要迁移
			if (currentUsed === 0 && fallbackKey) {
				const ipUsed = await readCounter(fallbackKey);
				if (ipUsed > 0) {
					// 将IP记录迁移到指纹记录
					currentUsed = ipUsed;
					await db_insert(db_name, "daily_usage", {
						...primaryKey,
						used: ipUsed,
						migratedFrom: "ip",
						createdAt: new Date(),
					});
				}
			}
		} else if (fallbackKey) {
			currentUsed = await readCounter(fallbackKey);
			activeKey = fallbackKey;
		}

		if (currentUsed + textLength > limits.dailyLimit) {
			return {
				allowed: false,
				message: `游客当日累计上限为 ${limits.dailyLimit.toLocaleString()} 字，请登录后继续使用`,
				userType,
			};
		}

		// 更新计数器：只更新活跃的key
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

		await incCounter(activeKey, textLength);
	}

	return {
		allowed: true,
		userType,
		...(userType === UserType.MEMBER && donationAmount > 0 && isAdvancedModel && {
			grantCallsRemaining: 0,
			paidCallsRemaining: 0,
		}),
	};
};
