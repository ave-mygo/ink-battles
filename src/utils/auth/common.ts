import { db_name } from "@/lib/constants";
import { db_read } from "@/lib/db";

/**
 * 生成下一个用户UID
 * @returns 新的用户UID
 */
export const generateNextUID = async (): Promise<number> => {
	try {
		// 查询最大的UID
		const users = await db_read(db_name, "users", {}, { sort: { uid: -1 }, limit: 1 });
		if (users.length === 0) {
			return 1; // 第一个用户从1开始
		}
		return (users[0].uid || 0) + 1;
	} catch (error) {
		console.error("生成UID失败:", error);
		// 如果查询失败，使用时间戳作为备用方案
		return Date.now() % 1000000;
	}
};
