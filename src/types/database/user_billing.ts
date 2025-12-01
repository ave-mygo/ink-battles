/**
 * 用户计费信息数据结构
 */
export interface UserBilling {
	_id?: string;
	uid: number; // 用户 UID
	totalAmount: number; // 累计消费总额（人民币）
	grantCallsBalance: number; // 赠送调用余额（每月刷新）
	paidCallsBalance: number; // 付费调用余额（永不过期，包含新用户赠送20次）
	lastGrantRefresh: Date; // 上次赠送刷新时间
	createdAt: Date; // 创建时间
	updatedAt: Date; // 更新时间
}

/**
 * 序列化后的用户计费信息（从 Server Action 接收）
 */
export interface SerializedUserBilling {
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	lastGrantRefresh: string;
	createdAt: string;
	updatedAt: string;
}
