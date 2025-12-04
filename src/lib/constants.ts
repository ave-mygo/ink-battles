import type { ComponentType } from "react";
import { CreditCard, History, Link as LinkIcon, User } from "lucide-react";

export const db_name = "ink_battles";
export const db_table = "analysis_requests";
export const db_collection_user_billing = "user_billing";
export const db_collection_afd_orders = "afd_orders";

// 使用额度与限制（字数）
export const PER_REQUEST_GUEST = 5000; // 未登录单次上限
export const PER_REQUEST_LOGGED = 60000; // 登录单次上限
export const DAILY_CAP_GUEST = 100000; // 未登录每日累计上限（按 IP 或 指纹 任一）

// 高级模型调用成本配置
export const ADVANCED_MODEL_BASE_COST = 0.5; // 单次高级模型调用基础成本（人民币）
export const GRANT_CALL_VIRTUAL_COST = 1.2; // 赠送调用虚拟单价（人民币）
export const MONTHLY_GRANT_BASE = 5; // 每月赠送保底次数
export const MONTHLY_GRANT_MAX = 60; // 每月赠送上限次数
export const NEW_USER_BONUS = 20; // 新用户注册赠送次数

// 会员等级和折扣配置
export const MEMBERSHIP_TIERS = {
	REGULAR: { minAmount: 0, maxAmount: 50, discount: 0, name: "普通会员" },
	BRONZE: { minAmount: 50, maxAmount: 150, discount: 0.05, name: "铜牌会员" },
	SILVER: { minAmount: 150, maxAmount: 300, discount: 0.1, name: "银牌会员" },
	GOLD: { minAmount: 300, maxAmount: 460, discount: 0.15, name: "金牌会员" },
	DIAMOND: { minAmount: 460, maxAmount: Infinity, discount: 0.2, name: "钻石会员" },
};

// 用户类型枚举
export enum UserType {
	GUEST = "guest", // 游客（未登录）
	REGULAR = "regular", // 普通用户（已登录但未捐赠）
	MEMBER = "member", // 会员用户（已登录且已捐赠）
}

// 会员等级枚举
export enum MemberTier {
	REGULAR = "REGULAR",
	BRONZE = "BRONZE",
	SILVER = "SILVER",
	GOLD = "GOLD",
	DIAMOND = "DIAMOND",
}

// 用户限制配置
export const USER_LIMITS = {
	[UserType.GUEST]: {
		perRequest: PER_REQUEST_GUEST,
		dailyLimit: DAILY_CAP_GUEST,
		advancedModelCalls: 0,
		hasUnlimitedAnalysis: false,
	},
	[UserType.REGULAR]: {
		perRequest: PER_REQUEST_LOGGED,
		dailyLimit: null, // 无日累计限制
		advancedModelCalls: 0,
		hasUnlimitedAnalysis: true,
	},
	[UserType.MEMBER]: {
		perRequest: null, // 无单次限制
		dailyLimit: null, // 无日累计限制
		advancedModelCalls: "calculated", // 根据捐赠金额计算
		hasUnlimitedAnalysis: true,
	},
};

/** 仪表盘侧边导航项类型 */
export interface DashboardNavItem {
	label: string;
	href: string;
	icon: ComponentType<{ className?: string }>;
}

/** FAQ 项类型 */
export interface FaqItemConfig {
	question: string;
	answer: string;
}

/** 仪表盘导航配置（从 DashboardLayoutClient 拆分） */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
	{ label: "用户信息", href: "/dashboard/profile", icon: User },
	{ label: "账号绑定与管理", href: "/dashboard/accounts", icon: LinkIcon },
	{ label: "分析历史", href: "/dashboard/history", icon: History },
	{ label: "账单管理", href: "/dashboard/billing", icon: CreditCard },
];

/** About 页面 FAQ 配置（集中管理，便于复用与 SEO） */
export const ABOUT_FAQ_ITEMS: FaqItemConfig[] = [
	{
		question: "AI会替代创作者吗？本系统的立场是什么？",
		answer:
			"我们深刻理解关于AI是否会替代创作者的担忧，但我们始终坚信，创作本质上是一种源自人类独特情感、思想和体验的表达方式，这些是机器无法复制的。AI技术虽然在处理大量信息、提供灵感拓展和优化语言表达上展现出强大能力，但它仅是辅助和工具的角色，而非创作者的替代者。\n本系统的定位是为创作者提供智能支持，帮助他们更高效地探索创意、发现写作盲点、提升作品质量。我们致力于通过数据驱动的分析和客观反馈，激发您的潜力，而非取代您的独特声音和主观判断。作品的灵魂与情感依然深植于您的内心，是AI无法复制的人类经验和创造精神。\n换言之，AI是您创作旅程中的“助力翅膀”，帮助您飞得更高、更远，而驾驶这架“飞机”的永远是您自己。我们希望通过技术赋能，让创作变得更轻松、有趣，同时保留并尊重创作者作为艺术家的核心地位。未来，AI与人类创作者的协作将创造更加丰富、多样的文化表达，而非单方面的替代与冲突。",
	},
	{
		question: "什么是作家战力分析系统？",
		answer:
			"作家战力分析系统（Ink Battles）是一个专业的AI文本分析平台，专为创作者设计。我们通过先进的AI技术提供多维度写作评估、内容质量打分、风格分析和创作建议，帮助作家提升创作水平。支持小说、文章、剧本等多种文体分析。",
	},
	{
		question: "如何开始使用系统？",
		answer:
			"使用流程非常简单：1) 在首页的文本框中输入或粘贴您的作品内容；2) 根据您的需求选择不同的评分模式和AI模型；3) 点击“开始分析”，系统会实时处理并展示分析结果；4) 在结果页查看详细的多维度分析报告和改进建议。",
	},
	{
		question: "我的数据安全如何保障？",
		answer:
			"我们高度重视您的数据安全与隐私。您提交的文本和分析结果会按照行业标准进行加密存储，以供您查阅历史记录。我们承诺不会将您的数据用于任何未经授权的用途。同时，分析过程会调用第三方AI服务，您的文本会经过我们和第三方服务商处理，详情请参阅我们的用户条款。",
	},
	{
		question: "分析的准确性如何？",
		answer:
			"我们的分析由多个先进的AI模型（如OpenAI、Google等）提供支持，力求提供专业、客观的反馈。但AI的判断并非绝对，分析结果仅供参考。我们强烈建议您将AI报告作为创作的辅助工具，并结合自身的经验和判断来使用。",
	},
	{
		question: "系统提供哪些分析模式？",
		answer:
			"我们提供多种预设的分析模式，例如“综合战力评分”、“各维度评分”、“作品概述”等，以满足不同场景的需求。您可以在“评分模式”区域自由组合，定制最适合您的分析视角。",
	},
	{
		question: "用户权限和会员服务有什么区别？",
		answer:
			"我们为不同用户提供分级服务：游客有基础的分析字数和次数限制；注册用户可以获得更高的免费额度并保存历史记录；赞助成为会员后，您将享有几乎无限制的分析字数、调用高级AI模型的权限以及专属折扣。",
	},
	{
		question: "为什么部分高级功能或模型无法使用？",
		answer:
			"为了保证服务质量和可持续运营，部分高级AI模型或特定分析功能（如“AI内容鉴别”）仅对会员用户或在特定活动期间开放。我们也在不断开发和迭代新功能，敬请期待。",
	},
	{
		question: "项目是否开源？我该如何参与？",
		answer:
			"是的，本项目以BSL 1.1 + AGPL-3.0双重许可证开源。我们欢迎开发者进行学习、二次开发或贡献代码。您可以在非生产环境中免费使用。如果您希望参与贡献或反馈问题，可以通过GitHub提交Issue或加入我们的社区进行讨论。",
	},
	{
		question: "如何联系我们或获得技术支持？",
		answer:
			"如果您遇到任何问题或有功能建议，可以通过以下方式联系我们：1) 在我们GitHub仓库的Issues页面提交问题；2) 加入我们的官方QQ群（625618470）与其他用户和开发者交流。我们非常珍视用户的反馈。",
	},
];

/**
 * 获取会员等级
 * @param totalAmount 累计消费总额
 * @returns 会员等级信息
 */
export function getMemberTier(totalAmount: number) {
	for (const [tier, config] of Object.entries(MEMBERSHIP_TIERS)) {
		if (totalAmount >= config.minAmount && totalAmount < config.maxAmount) {
			return { tier: tier as MemberTier, ...config };
		}
	}
	return { tier: MemberTier.REGULAR, ...MEMBERSHIP_TIERS.REGULAR };
}

/**
 * 计算每月赠送调用次数（基于累计消费总额）
 * @param totalAmount 累计消费总额
 * @returns 每月赠送调用次数
 */
export function calculateMonthlyGrantCalls(totalAmount: number): number {
	const calculated = MONTHLY_GRANT_BASE + Math.floor(totalAmount / GRANT_CALL_VIRTUAL_COST);
	return Math.min(calculated, MONTHLY_GRANT_MAX);
}

/**
 * 计算付费购买单次调用价格
 * @param totalAmount 累计消费总额
 * @returns 单次调用价格
 */
export function calculatePaidCallPrice(totalAmount: number): number {
	const tierInfo = getMemberTier(totalAmount);
	return ADVANCED_MODEL_BASE_COST * (1 - tierInfo.discount);
}

/**
 * 根据捐赠金额计算会员每日高级模型调用次数 (兼容旧版本)
 * @deprecated 请使用新的计费系统
 * @param donationAmount 捐赠金额（人民币）
 * @returns 每日高级模型调用次数
 */
export function calculateAdvancedModelCalls(donationAmount: number): number {
	return Math.floor(donationAmount / ADVANCED_MODEL_BASE_COST * 2);
}
