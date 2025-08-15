import process from "node:process";
import md5 from "md5";
import { db_name } from "@/lib/constants";
import { db_find, db_update } from "@/lib/db";

const AFDIAN_API_TOKEN = process.env.AFDIAN_API_TOKEN;
const AFDIAN_USER_ID = process.env.AFDIAN_USER_ID;

export interface UserInfo {
	id: string;
	username: string;
	email: string;
	avatar: string;
	afdian_user_id?: string;
	afdian_bound: boolean;
	afdian_username?: string;
	afdian_avatar?: string;
	qqOpenid?: string;
	loginMethod?: "email" | "qq";
}

export interface SponsorInfo {
	user_id: string;
	name: string;
	avatar?: string;
	all_sum_amount: number;
	bound_order_id?: string;
	binding_method: "oauth" | "order_id";
	create_time?: number;
	last_pay_time?: number;
}

export interface SubscriptionInfo {
	isSubscribed: boolean;
	sponsorInfo: SponsorInfo | null;
	totalAmount: number;
	currentPlan: any;
	subscriptionStatus: string;
}

export interface UserSubscriptionData {
	user: UserInfo;
	subscription: SubscriptionInfo;
}

/**
 * 统一获取用户订阅信息的函数
 * @param userEmail 用户邮箱
 * @returns 用户订阅数据
 */
export async function getUserSubscriptionData(userEmail: string): Promise<UserSubscriptionData> {
	// 通过邮箱查找用户
	const user = await db_find(db_name, "users", { email: userEmail });
	if (!user) {
		throw new Error("用户不存在");
	}

	const safeId = (user as any)._id?.toString ? (user as any)._id.toString() : String((user as any)._id ?? "");
	const safeUsername = user.username || (user.email ? String(user.email).split("@")[0] : "用户");
	const safeEmail = user.email || "";

	// 检查是否绑定了爱发电账号
	if (!user.afdian_user_id) {
		return {
			user: {
				id: safeId,
				username: safeUsername,
				email: safeEmail,
				avatar: user.avatar || "",
				afdian_bound: false,
				qqOpenid: user.qqOpenid,
				loginMethod: user.loginMethod,
			},
			subscription: {
				isSubscribed: false,
				sponsorInfo: null,
				totalAmount: 0,
				currentPlan: null,
				subscriptionStatus: "not_bound",
			},
		};
	}

	// 如果是通过订单号绑定的用户，获取详细用户信息
	if (user.afdian_bound_order_id && user.afdian_total_amount !== undefined) {
		let totalAmount = user.afdian_total_amount || 0;
		let afdianUserInfo = {
			user_id: user.afdian_user_id,
			name: user.afdian_username || "爱发电用户",
			avatar: user.afdian_avatar || "",
		};

		// 尝试获取最新的用户信息和总捐赠额
		try {
			const ts = Math.floor(Date.now() / 1000);
			const sponsorParams = JSON.stringify({
				user_id: user.afdian_user_id,
			});
			const sponsorSign = md5(`${AFDIAN_API_TOKEN}params${sponsorParams}ts${ts}user_id${AFDIAN_USER_ID}`);

			const sponsorResponse = await fetch("https://afdian.com/api/open/query-sponsor", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					user_id: AFDIAN_USER_ID,
					params: sponsorParams,
					ts,
					sign: sponsorSign,
				}),
			});

			if (sponsorResponse.ok) {
				const sponsorData = await sponsorResponse.json();
				if (sponsorData.ec === 200 && sponsorData.data?.list?.length > 0) {
					const sponsor = sponsorData.data.list.find((s: any) => s.user?.user_id === user.afdian_user_id);
					if (sponsor) {
						totalAmount = Number.parseFloat(sponsor.all_sum_amount) || totalAmount;
						afdianUserInfo = {
							user_id: sponsor.user.user_id,
							name: sponsor.user.name || afdianUserInfo.name,
							avatar: sponsor.user.avatar || afdianUserInfo.avatar,
						};

						// 更新数据库中的信息
						await db_update(
							db_name,
							"users",
							{ _id: user._id },
							{
								$set: {
									afdian_total_amount: totalAmount,
									afdian_username: afdianUserInfo.name,
									afdian_avatar: afdianUserInfo.avatar,
									updated_at: new Date(),
								},
							},
						);
					}
				}
			}
		} catch (error) {
			console.warn("获取最新用户信息失败，使用缓存信息:", error);
		}

		const isSubscribed = totalAmount > 0;

		return {
			user: {
				id: safeId,
				username: safeUsername,
				email: safeEmail,
				avatar: user.avatar || afdianUserInfo.avatar,
				afdian_bound: true,
				afdian_user_id: user.afdian_user_id,
				afdian_username: afdianUserInfo.name,
				afdian_avatar: afdianUserInfo.avatar,
				qqOpenid: user.qqOpenid,
				loginMethod: user.loginMethod,
			},
			subscription: {
				isSubscribed,
				sponsorInfo: isSubscribed
					? {
							user_id: afdianUserInfo.user_id,
							name: afdianUserInfo.name,
							avatar: afdianUserInfo.avatar,
							all_sum_amount: totalAmount,
							bound_order_id: user.afdian_bound_order_id,
							binding_method: "order_id",
						}
					: null,
				totalAmount,
				currentPlan: null,
				subscriptionStatus: isSubscribed ? "active" : "inactive",
			},
		};
	}

	// 对于OAuth绑定但没有access_token的用户
	if (!user.afdian_access_token) {
		return {
			user: {
				id: safeId,
				username: safeUsername,
				email: safeEmail,
				avatar: user.avatar || user.afdian_avatar || "",
				afdian_bound: true,
				afdian_user_id: user.afdian_user_id,
				afdian_username: user.afdian_username,
				afdian_avatar: user.afdian_avatar,
				qqOpenid: user.qqOpenid,
				loginMethod: user.loginMethod,
			},
			subscription: {
				isSubscribed: false,
				sponsorInfo: null,
				totalAmount: 0,
				currentPlan: null,
				subscriptionStatus: "api_error",
			},
		};
	}

	// 使用爱发电API获取OAuth绑定用户的订阅信息
	const ts = Math.floor(Date.now() / 1000);
	const params = JSON.stringify({
		user_id: user.afdian_user_id,
	});
	const sign = md5(`${AFDIAN_API_TOKEN}params${params}ts${ts}user_id${AFDIAN_USER_ID}`);

	try {
		const response = await fetch("https://afdian.com/api/open/query-sponsor", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${user.afdian_access_token}`,
			},
			body: JSON.stringify({
				user_id: AFDIAN_USER_ID,
				params,
				ts,
				sign,
			}),
		});

		if (!response.ok) {
			console.error("爱发电API调用失败:", await response.text());
			// 如果API调用失败，返回基本用户信息，但包含更多爱发电账号信息
			return {
				user: {
					id: safeId,
					username: safeUsername,
					email: safeEmail,
					avatar: user.avatar || user.afdian_avatar,
					afdian_bound: true,
					afdian_user_id: user.afdian_user_id,
					afdian_username: user.afdian_username,
					afdian_avatar: user.afdian_avatar,
					qqOpenid: user.qqOpenid,
					loginMethod: user.loginMethod,
				},
				subscription: {
					isSubscribed: false,
					sponsorInfo: null,
					totalAmount: 0,
					currentPlan: null,
					subscriptionStatus: "api_error",
				},
			};
		}

		const data = await response.json();

		// 检查用户是否有有效的订阅
		const sponsorData = data.data?.list || [];
		const userSponsor = sponsorData.find((sponsor: any) =>
			sponsor.user?.user_id === user.afdian_user_id,
		);

		const subscriptionInfo: SubscriptionInfo = {
			isSubscribed: !!userSponsor,
			sponsorInfo: userSponsor
				? {
						user_id: userSponsor.user.user_id,
						name: userSponsor.user.name,
						avatar: userSponsor.user.avatar,
						all_sum_amount: Number.parseFloat(userSponsor.all_sum_amount) || 0,
						create_time: userSponsor.create_time,
						last_pay_time: userSponsor.last_pay_time,
						binding_method: "oauth",
					}
				: null,
			totalAmount: userSponsor?.all_sum_amount || 0,
			currentPlan: userSponsor?.current_plan || null,
			subscriptionStatus: userSponsor ? "active" : "inactive",
		};

		return {
			user: {
				id: safeId,
				username: safeUsername,
				email: safeEmail,
				avatar: user.avatar || (userSponsor?.user?.avatar) || user.afdian_avatar,
				afdian_bound: true,
				afdian_user_id: user.afdian_user_id,
				afdian_username: (userSponsor?.user?.name) || user.afdian_username,
				afdian_avatar: (userSponsor?.user?.avatar) || user.afdian_avatar,
				qqOpenid: user.qqOpenid,
				loginMethod: user.loginMethod,
			},
			subscription: subscriptionInfo,
		};
	} catch (error) {
		console.error("获取用户订阅信息失败:", error);
		throw new Error("获取订阅信息失败");
	}
}
