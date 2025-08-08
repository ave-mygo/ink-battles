export const db_name = "ink_battles";
export const db_table = "analysis_requests";

// 使用额度与限制（字数）
export const PER_REQUEST_GUEST = 5000; // 未登录单次上限
export const PER_REQUEST_LOGGED = 60000; // 登录单次上限
export const DAILY_CAP_GUEST = 100000; // 未登录每日累计上限（按 IP 或 指纹 任一）
