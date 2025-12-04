/**
 * 邀请码工具模块
 * 提供邀请码验证和管理功能
 */

export {
	consumeInviteCode,
	isInviteCodeRequired,
	validateInviteCode,
} from "./server";

export type { InviteCode } from "./server";
