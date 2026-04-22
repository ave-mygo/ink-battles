export interface UserBilling {
	_id?: string;
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	lastGrantRefresh: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface SerializedUserBilling {
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	lastGrantRefresh: string;
	createdAt: string;
	updatedAt: string;
}
