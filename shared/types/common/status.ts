export interface UsageLog {
	created_at: number;
	request_id?: string;
	type: number;
	model_name: string;
	quota: number;
	prompt_tokens: number;
	completion_tokens: number;
	use_time: number;
	is_stream: boolean;
	token_id: number;
	parent_id: number;
	attempt_count?: number;
}

export interface Stats {
	totalRequests: number;
	averageTime: number;
	totalTokens: number;
	successRate: number;
}

export interface StatusApiResponse {
	success: boolean;
	items: UsageLog[];
	page: number;
	page_size: number;
	total: number;
	has_more: boolean;
	stats: Stats;
}

export interface StatusListProps {
	logs: UsageLog[];
	loading?: boolean;
}

export interface StatusDashboardProps {
	initialData: StatusApiResponse;
}
