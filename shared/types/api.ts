export interface ApiResult<T = unknown> {
	success: boolean;
	message?: string;
	error?: string;
	data?: T;
}
