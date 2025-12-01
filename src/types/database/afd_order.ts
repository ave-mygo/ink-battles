/**
 * 爱发电订单数据结构
 */
export interface AfdOrder {
	_id?: string;
	orderNo: string; // 订单号 (out_trade_no)
	uid: number; // 用户 UID
	afdId: string; // 爱发电账户 ID
	amount: number; // 订单金额
	redeemedAt: Date; // 兑换时间
	grantCallsAdded: number; // 本次兑换增加的赠送调用次数
	paidCallsAdded: number; // 本次兑换增加的付费调用次数
}
