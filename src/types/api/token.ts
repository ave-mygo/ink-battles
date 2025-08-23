/**
 * API Key 记录类型
 * 来源：token-server.ts
 */
export interface ApiKeyRecord {
	_id?: string;
	orderNumber: string;
	orderTime: Date;
	firstIssuedTime: Date;
	lastFingerprintUpdateTime: Date;
	userIp: string;
	token: string;
	browserFingerprint: string;
	isActive: boolean;
}
