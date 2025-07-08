export interface UsageLog {
	created_at: number;
	type: number;
	model_name: string;
	quota: number;
	prompt_tokens: number;
	completion_tokens: number;
	use_time: number;
	is_stream: boolean;
	token_id: number;
	parent_id: number;
}
export interface Stats {
	totalRequests: number;
	averageTime: number;
	totalTokens: number;
	successRate: number;
}
// 修正后的 ApiResponse 接口
export interface ApiResponse {
	success: boolean;
	// 移除了 message 字段，因为在提供的JSON中没有
	items: UsageLog[];
	page: number;
	page_size: number;
	total: number;
	stats: Stats;
}
