import { getConfig } from "../config";

type ExternalStatusLog = Record<string, unknown> & {
	request_id?: string;
	created_at?: number;
	quota?: number;
	use_time?: number;
	prompt_tokens?: number;
	completion_tokens?: number;
};

const hideSensitiveLogFields = (item: Record<string, unknown>) => {
	const copy = { ...item };
	["username", "user_id", "other", "ip", "group", "content", "channel", "channel_name", "token_name"].forEach(key => delete copy[key]);
	return copy;
};

const toNumber = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);

const pickRepresentativeLog = (logs: ExternalStatusLog[]) => {
	const successfulLog = logs
		.filter(log => toNumber(log.quota) > 0)
		.sort((left, right) => toNumber(right.created_at) - toNumber(left.created_at))[0];

	if (successfulLog)
		return successfulLog;

	return [...logs].sort((left, right) => toNumber(right.created_at) - toNumber(left.created_at))[0];
};

/**
 * 按 Request ID 合并同一次用户请求的多条渠道尝试日志。
 *
 * 规则：
 * 1. 有 Request ID 时，以 Request ID 作为逻辑请求主键。
 * 2. 优先保留最终成功的那条日志作为展示主体；若都失败，则保留最后一次尝试。
 * 3. 响应时间累计所有尝试耗时，状态按“任一成功即成功”判断。
 */
const mergeLogsByRequestId = (logs: ExternalStatusLog[]) => {
	const groupedLogs = new Map<string, ExternalStatusLog[]>();
	const passthroughLogs: ExternalStatusLog[] = [];

	logs.forEach((log) => {
		const requestId = typeof log.request_id === "string" ? log.request_id.trim() : "";
		if (!requestId) {
			passthroughLogs.push(log);
			return;
		}

		const existingGroup = groupedLogs.get(requestId) ?? [];
		existingGroup.push(log);
		groupedLogs.set(requestId, existingGroup);
	});

	const mergedLogs = Array.from(groupedLogs.entries()).map(([requestId, requestLogs]) => {
		const representativeLog = pickRepresentativeLog(requestLogs);
		const hasSuccess = requestLogs.some(log => toNumber(log.quota) > 0);

		return {
			...representativeLog,
			request_id: requestId,
			quota: hasSuccess ? Math.max(...requestLogs.map(log => toNumber(log.quota))) : 0,
			use_time: requestLogs.reduce((sum, log) => sum + toNumber(log.use_time), 0),
			attempt_count: requestLogs.length,
			prompt_tokens: toNumber(representativeLog.prompt_tokens),
			completion_tokens: toNumber(representativeLog.completion_tokens),
			created_at: Math.max(...requestLogs.map(log => toNumber(log.created_at))),
		};
	});

	return [...mergedLogs, ...passthroughLogs]
		.sort((left, right) => toNumber(right.created_at) - toNumber(left.created_at));
};

export const getExternalStatus = async (page: number, pageSize: number) => {
	const { api } = getConfig();
	const end = Math.floor(Date.now() / 1000);
	const start = end - 14 * 24 * 60 * 60;
	const headers = { "Authorization": `Bearer ${api.key || ""}`, "new-api-user": `${api.user || ""}` };

	const [logResponse, statsResponse] = await Promise.all([
		fetch(`${api.base_url}/api/log/self?p=${page}&page_size=${pageSize}&type=0&start_timestamp=${start}&end_timestamp=${end}&group=`, { headers }),
		fetch(`${api.base_url}/api/data/self?start_timestamp=${start}&end_timestamp=${end}&default_time=hour`, { headers }),
	]);

	const data = await logResponse.json();
	const statsData = await statsResponse.json();
	const items = (statsData.data ?? []).map(hideSensitiveLogFields);
	const rawLogs = (data.data.items ?? []).map(hideSensitiveLogFields) as ExternalStatusLog[];
	const mergedLogs = mergeLogsByRequestId(rawLogs);
	data.data.items = mergedLogs;

	return {
		success: true,
		...data.data,
		stats: {
			totalRequests: items.reduce((sum: number, item: any) => sum + item.count, 0),
			averageTime: data.data.items.length ? data.data.items.reduce((sum: number, log: any) => sum + log.use_time, 0) / data.data.items.length : 0,
			successRate: data.data.items.length ? (data.data.items.filter((log: any) => log.quota > 0).length / data.data.items.length) * 100 : 0,
			totalTokens: items.reduce((sum: number, item: any) => sum + item.token_used, 0),
		},
		has_more: toNumber(data.data.total) > page * pageSize,
	};
};
