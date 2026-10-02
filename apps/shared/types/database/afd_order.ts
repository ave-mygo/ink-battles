export interface AfdOrder {
	_id?: string;
	orderNo: string;
	uid: number;
	afdId: string;
	amount: number;
	redeemedAt: Date;
	grantCallsAdded: number;
	paidCallsAdded: number;
}
