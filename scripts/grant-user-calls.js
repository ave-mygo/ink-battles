#!/usr/bin/env node

/**
 * 用户调用次数赠送脚本
 * 用途：批量给用户赠送调用次数（支持赠送次数和付费次数）
 *
 * 使用方法：
 * node scripts/grant-user-calls.js [模式] [参数...] [赠送次数] [付费次数] [备注]
 *
 * 模式说明：
 * --uid <uid>                    给指定用户ID赠送
 * --query <json>                 给符合MongoDB查询条件的用户赠送
 * --range <start> <end>          给指定UID范围内的用户赠送
 * --all                          给所有用户赠送
 *
 * 示例：
 * node scripts/grant-user-calls.js --uid 1001 10 5 "新年活动赠送"
 * node scripts/grant-user-calls.js --query '{"totalAmount":{"$gte":50}}' 20 0 "VIP用户额外赠送"
 * node scripts/grant-user-calls.js --range 1000 2000 5 0 "早期用户回馈"
 * node scripts/grant-user-calls.js --all 3 0 "全体用户春节福利"
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置读取
let config = null;
try {
	const configPath = path.join(__dirname, "../config.toml");
	const toml = await import("toml");
	const configContent = await fs.readFile(configPath, "utf-8");
	config = toml.parse(configContent);
} catch (error) {
	console.error("❌ 无法读取配置文件 config.toml:", error.message);
	console.log("请确保 config.toml 文件存在于项目根目录");
	process.exit(1);
}

// 数据库配置
const MONGO_HOST = config?.mongodb?.host || "127.0.0.1";
const MONGO_PORT = config?.mongodb?.port || 27017;
const MONGO_USER = config?.mongodb?.user;
const MONGO_PASS = config?.mongodb?.password;
const DB_NAME = config?.mongodb?.database || "ink_battles";
const COLLECTION_USER_BILLING = "user_billing";

const uri = MONGO_USER && MONGO_PASS
	? `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}`
	: `mongodb://${MONGO_HOST}:${MONGO_PORT}`;

/**
 * 解析命令行参数
 * @param {string[]} args 命令行参数
 * @returns {object} 解析后的参数对象
 */
function parseArgs(args) {
	if (args.length < 3) {
		throw new Error("参数不足，请查看使用说明");
	}

	const mode = args[0];
	let targetConfig = {};
	let paramIndex = 1;

	switch (mode) {
		case "--uid": {
			const uid = Number.parseInt(args[1]);
			if (Number.isNaN(uid) || uid <= 0) {
				throw new Error("无效的用户ID");
			}
			targetConfig = { type: "uid", uid };
			paramIndex = 2;
			break;
		}
		case "--query": {
			try {
				const query = JSON.parse(args[1]);
				targetConfig = { type: "query", query };
				paramIndex = 2;
			} catch {
				throw new Error("无效的JSON查询条件");
			}
			break;
		}
		case "--range": {
			const start = Number.parseInt(args[1]);
			const end = Number.parseInt(args[2]);
			if (Number.isNaN(start) || Number.isNaN(end) || start <= 0 || end <= 0 || start > end) {
				throw new Error("无效的UID范围");
			}
			targetConfig = { type: "range", start, end };
			paramIndex = 3;
			break;
		}
		case "--all": {
			targetConfig = { type: "all" };
			paramIndex = 1;
			break;
		}
		default:
			throw new Error(`未知的模式: ${mode}`);
	}

	const grantCalls = Number.parseInt(args[paramIndex]) || 0;
	const paidCalls = Number.parseInt(args[paramIndex + 1]) || 0;
	const note = args[paramIndex + 2] || "";

	if (grantCalls < 0 || paidCalls < 0) {
		throw new Error("赠送次数不能为负数");
	}

	if (grantCalls === 0 && paidCalls === 0) {
		throw new Error("至少需要赠送一种类型的次数");
	}

	return {
		targetConfig,
		grantCalls,
		paidCalls,
		note,
	};
}

/**
 * 构建查询条件
 * @param {object} targetConfig 目标配置
 * @returns {object} MongoDB查询条件
 */
function buildQuery(targetConfig) {
	switch (targetConfig.type) {
		case "uid":
			return { uid: targetConfig.uid };
		case "query":
			return targetConfig.query;
		case "range":
			return { uid: { $gte: targetConfig.start, $lte: targetConfig.end } };
		case "all":
			return {};
		default:
			throw new Error("未知的目标配置类型");
	}
}

/**
 * 获取目标用户描述
 * @param {object} targetConfig 目标配置
 * @returns {string} 描述文本
 */
function getTargetDescription(targetConfig) {
	switch (targetConfig.type) {
		case "uid":
			return `用户ID: ${targetConfig.uid}`;
		case "query":
			return `查询条件: ${JSON.stringify(targetConfig.query)}`;
		case "range":
			return `UID范围: ${targetConfig.start} - ${targetConfig.end}`;
		case "all":
			return "所有用户";
		default:
			return "未知目标";
	}
}

/**
 * 批量赠送调用次数
 * @param {object} targetConfig 目标配置
 * @param {number} grantCalls 赠送次数
 * @param {number} paidCalls 付费次数
 * @param {string} note 备注
 */
async function grantUserCalls(targetConfig, grantCalls, paidCalls, note) {
	let client;

	try {
		// 连接数据库
		console.log("🔌 正在连接数据库...");
		client = new MongoClient(uri);
		await client.connect();
		console.log("✅ 数据库连接成功");

		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_USER_BILLING);

		// 构建查询条件
		const query = buildQuery(targetConfig);

		// 先查询符合条件的用户数量
		const totalUsers = await collection.countDocuments(query);
		if (totalUsers === 0) {
			console.log("⚠️  没有找到符合条件的用户");
			return;
		}

		console.log(`\n📊 找到 ${totalUsers} 个符合条件的用户`);
		console.log(`目标: ${getTargetDescription(targetConfig)}`);
		console.log(`赠送次数: ${grantCalls}`);
		console.log(`付费次数: ${paidCalls}`);
		if (note) {
			console.log(`备注: ${note}`);
		}

		// 确认操作
		if (totalUsers > 100) {
			console.log("\n⚠️  将要操作超过100个用户，请确认操作无误");
		}

		// 构建更新操作
		const updateDoc = {
			$inc: {},
			$set: {
				updatedAt: new Date(),
			},
		};

		if (grantCalls > 0) {
			updateDoc.$inc.grantCallsBalance = grantCalls;
		}
		if (paidCalls > 0) {
			updateDoc.$inc.paidCallsBalance = paidCalls;
		}

		// 执行批量更新
		console.log("\n💾 正在执行批量更新...");
		const result = await collection.updateMany(query, updateDoc);

		console.log(`✅ 更新完成！`);
		console.log(`匹配用户数: ${result.matchedCount}`);
		console.log(`实际更新数: ${result.modifiedCount}`);

		// 记录操作日志
		const logCollection = db.collection("admin_operations");
		const logEntry = {
			operation: "grant_user_calls",
			targetConfig,
			grantCalls,
			paidCalls,
			note,
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
			executedAt: new Date(),
		};

		await logCollection.insertOne(logEntry);
		console.log("📝 操作日志已记录");

		// 保存操作报告到文件
		const outputDir = path.join(__dirname, "../output");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
		const filename = `grant-calls-report-${timestamp}.txt`;
		const filePath = path.join(outputDir, filename);

		try {
			await fs.mkdir(outputDir, { recursive: true });
			const reportContent = [
				"用户调用次数赠送报告",
				"=".repeat(80),
				`执行时间: ${new Date().toLocaleString("zh-CN")}`,
				`目标用户: ${getTargetDescription(targetConfig)}`,
				`赠送次数: ${grantCalls}`,
				`付费次数: ${paidCalls}`,
				note ? `备注: ${note}` : "",
				"",
				"执行结果:",
				`匹配用户数: ${result.matchedCount}`,
				`实际更新数: ${result.modifiedCount}`,
				"",
				"查询条件:",
				JSON.stringify(query, null, 2),
				"",
				"更新操作:",
				JSON.stringify(updateDoc, null, 2),
				"=".repeat(80),
			].filter(Boolean).join("\n");

			await fs.writeFile(filePath, reportContent, "utf-8");
			console.log(`\n💾 操作报告已保存到文件: ${filePath}`);
		} catch (error) {
			console.error(`\n⚠️  保存报告文件失败: ${error.message}`);
		}

		// 显示一些示例用户的更新后状态
		if (result.modifiedCount > 0 && result.modifiedCount <= 10) {
			console.log("\n📋 更新后的用户状态示例:");
			console.log("-".repeat(80));
			const updatedUsers = await collection.find(query).limit(10).toArray();
			updatedUsers.forEach((user, index) => {
				console.log(`${index + 1}. UID: ${user.uid}, 赠送余额: ${user.grantCallsBalance}, 付费余额: ${user.paidCallsBalance}`);
			});
		}

	} catch (error) {
		console.error("\n❌ 错误:", error.message);
		process.exit(1);
	} finally {
		if (client) {
			await client.close();
			console.log("\n🔌 数据库连接已关闭");
		}
	}
}

// 主函数
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		console.log(`
🎯 用户调用次数赠送脚本

使用方法：
  node scripts/grant-user-calls.js [模式] [参数...] [赠送次数] [付费次数] [备注]

模式说明：
  --uid <uid>                    给指定用户ID赠送
  --query <json>                 给符合MongoDB查询条件的用户赠送
  --range <start> <end>          给指定UID范围内的用户赠送
  --all                          给所有用户赠送

示例：
  node scripts/grant-user-calls.js --uid 1001 10 5 "新年活动赠送"
  node scripts/grant-user-calls.js --query '{"totalAmount":{"$gte":50}}' 20 0 "VIP用户额外赠送"
  node scripts/grant-user-calls.js --range 1000 2000 5 0 "早期用户回馈"
  node scripts/grant-user-calls.js --all 3 0 "全体用户春节福利"

参数说明：
  赠送次数: 增加的每月刷新赠送次数
  付费次数: 增加的付费调用次数
  备注: 操作备注（可选）

注意事项：
  - 赠送次数和付费次数至少有一个大于0
  - 操作会记录到admin_operations集合中
  - 大批量操作会生成详细的报告文件
		`);
		process.exit(0);
	}

	try {
		const { targetConfig, grantCalls, paidCalls, note } = parseArgs(args);

		console.log("\n🎯 用户调用次数赠送配置");
		console.log("=".repeat(80));
		console.log(`目标用户: ${getTargetDescription(targetConfig)}`);
		console.log(`赠送次数: ${grantCalls}`);
		console.log(`付费次数: ${paidCalls}`);
		if (note) {
			console.log(`备注: ${note}`);
		}
		console.log("=".repeat(80));

		await grantUserCalls(targetConfig, grantCalls, paidCalls, note);

		console.log("\n✨ 完成！");
	} catch (error) {
		console.error(`\n❌ 参数错误: ${error.message}`);
		console.log("\n使用 --help 查看详细使用说明");
		process.exit(1);
	}
}

// 运行主函数
main().catch((error) => {
	console.error("❌ 未预期的错误:", error);
	process.exit(1);
});