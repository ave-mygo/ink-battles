#!/usr/bin/env node

/**
 * 邀请码生成脚本
 * 用途：批量生成邀请码并插入到数据库
 *
 * 使用方法：
 * node scripts/generate-invite-codes.js [数量] [最大使用次数] [过期天数] [备注]
 *
 * 示例：
 * node scripts/generate-invite-codes.js 10 1 30 "2025年新年活动邀请码"
 * node scripts/generate-invite-codes.js 5 0 0 "内测无限制邀请码"
 */

import crypto from "node:crypto";
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
	console.log(configPath);
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

const uri = MONGO_USER && MONGO_PASS
	? `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}`
	: `mongodb://${MONGO_HOST}:${MONGO_PORT}`;

/**
 * 生成随机邀请码
 * @param {number} length 邀请码长度
 * @returns {string} 邀请码
 */
function generateCode(length = 8) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 移除容易混淆的字符 I, O, 0, 1
	let code = "";
	const bytes = crypto.randomBytes(length);
	for (let i = 0; i < length; i++) {
		code += chars[bytes[i] % chars.length];
	}
	return code;
}

/**
 * 检查邀请码是否已存在
 * @param {import("mongodb").Collection} collection 集合
 * @param {string} code 邀请码
 * @returns {Promise<boolean>} 是否存在
 */
async function codeExists(collection, code) {
	const result = await collection.findOne({ code });
	return result !== null;
}

/**
 * 生成唯一邀请码
 * @param {import("mongodb").Collection} collection 集合
 * @param {number} length 长度
 * @returns {Promise<string>} 唯一邀请码
 */
async function generateUniqueCode(collection, length = 8) {
	let code;
	let attempts = 0;
	const maxAttempts = 100;

	do {
		code = generateCode(length);
		attempts++;
		if (attempts >= maxAttempts) {
			throw new Error("生成唯一邀请码失败，请稍后重试");
		}
	} while (await codeExists(collection, code));

	return code;
}

/**
 * 批量生成邀请码
 * @param {number} count 生成数量
 * @param {number} maxUses 最大使用次数，0表示无限制
 * @param {number} expiresInDays 过期天数，0表示永不过期
 * @param {string} note 备注
 */
const TIMESTAMP_REPLACE_REGEX = /[:.]/g;

async function generateInviteCodes(count, maxUses, expiresInDays, note) {
	let client;

	try {
		// 连接数据库
		console.log("🔌 正在连接数据库...");
		client = new MongoClient(uri);
		await client.connect();
		console.log("✅ 数据库连接成功");

		const db = client.db(DB_NAME);
		const collection = db.collection("invite_codes");

		// 创建索引
		await collection.createIndex({ code: 1 }, { unique: true });
		console.log("✅ 索引创建完成");

		const codes = [];
		const now = new Date();
		const expiresAt = expiresInDays > 0
			? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
			: null;

		console.log(`\n📝 开始生成 ${count} 个邀请码...\n`);

		for (let i = 0; i < count; i++) {
			const code = await generateUniqueCode(collection, 8);
			const inviteCode = {
				code,
				createdAt: now,
				maxUses,
				usedCount: 0,
				isActive: true,
				note: note || undefined,
			};

			if (expiresAt) {
				inviteCode.expiresAt = expiresAt;
			}

			codes.push(inviteCode);
			process.stdout.write(`生成进度: ${i + 1}/${count}\r`);
		}

		console.log("\n");

		// 批量插入
		console.log("💾 正在保存到数据库...");
		const result = await collection.insertMany(codes);
		console.log(`✅ 成功插入 ${result.insertedCount} 条邀请码记录\n`);

		// 显示生成的邀请码
		console.log("=".repeat(80));
		console.log("📋 生成的邀请码列表");
		console.log("=".repeat(80));
		console.log(`生成时间: ${now.toLocaleString("zh-CN")}`);
		console.log(`最大使用次数: ${maxUses === 0 ? "无限制" : maxUses}`);
		console.log(`过期时间: ${expiresAt ? expiresAt.toLocaleString("zh-CN") : "永不过期"}`);
		if (note) {
			console.log(`备注: ${note}`);
		}
		console.log("-".repeat(80));

		codes.forEach((code, index) => {
			console.log(`${String(index + 1).padStart(3, " ")}. ${code.code}`);
		});

		console.log("=".repeat(80));

		// 保存到文件
		const outputDir = path.join(__dirname, "../output");
		const timestamp = now.toISOString().replace(TIMESTAMP_REPLACE_REGEX, "-").slice(0, -5);
		const filename = `invite-codes-${timestamp}.txt`;
		const filePath = path.join(outputDir, filename);

		try {
			await fs.mkdir(outputDir, { recursive: true });
			const fileContent = [
				"Ink Battles 邀请码",
				"=".repeat(80),
				`生成时间: ${now.toLocaleString("zh-CN")}`,
				`生成数量: ${count}`,
				`最大使用次数: ${maxUses === 0 ? "无限制" : maxUses}`,
				`过期时间: ${expiresAt ? expiresAt.toLocaleString("zh-CN") : "永不过期"}`,
				note ? `备注: ${note}` : "",
				"=".repeat(80),
				"",
				...codes.map((code, index) => `${String(index + 1).padStart(3, " ")}. ${code.code}`),
				"",
				"=".repeat(80),
			].filter(Boolean).join("\n");

			await fs.writeFile(filePath, fileContent, "utf-8");
			console.log(`\n💾 邀请码已保存到文件: ${filePath}\n`);
		} catch (error) {
			console.error(`\n⚠️  保存文件失败: ${error.message}`);
		}
	} catch (error) {
		console.error("\n❌ 错误:", error.message);
		process.exit(1);
	} finally {
		if (client) {
			await client.close();
			console.log("🔌 数据库连接已关闭");
		}
	}
}

// 主函数
async function main() {
	const args = process.argv.slice(2);

	// 参数解析
	const count = Number.parseInt(args[0]) || 10;
	const maxUses = Number.parseInt(args[1]) || 1;
	const expiresInDays = Number.parseInt(args[2]) || 0;
	const note = args[3] || "";

	// 参数验证
	if (count <= 0 || count > 1000) {
		console.error("❌ 生成数量必须在 1-1000 之间");
		process.exit(1);
	}

	if (maxUses < 0) {
		console.error("❌ 最大使用次数不能为负数");
		process.exit(1);
	}

	if (expiresInDays < 0) {
		console.error("❌ 过期天数不能为负数");
		process.exit(1);
	}

	console.log("\n🎯 邀请码生成配置");
	console.log("=".repeat(80));
	console.log(`生成数量: ${count}`);
	console.log(`最大使用次数: ${maxUses === 0 ? "无限制" : maxUses}`);
	console.log(`过期天数: ${expiresInDays === 0 ? "永不过期" : `${expiresInDays} 天`}`);
	if (note) {
		console.log(`备注: ${note}`);
	}
	console.log(`${"=".repeat(80)}\n`);

	await generateInviteCodes(count, maxUses, expiresInDays, note);

	console.log("✨ 完成！\n");
}

// 运行主函数
main().catch((error) => {
	console.error("❌ 未预期的错误:", error);
	process.exit(1);
});
