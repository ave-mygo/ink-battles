#!/usr/bin/env node

/**
 * 数据库结构分析脚本
 * 自动分析 MongoDB 数据库中的集合结构并生成文档
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const DB_NAME = "ink_battles";

// 需要分析的集合列表
const COLLECTIONS = [
	"users",
	"analysis_requests",
	"sessions",
];

// 数据库连接配置
function getMongoClient() {
	const MONGO_HOST = process.env.MONGO_HOST || "192.168.3.2";
	let MONGO_PORT = (process.env.MONGO_PORT || 27017).toString();
	const MONGO_USER = process.env.MONGO_USER;
	const MONGO_PASS = process.env.MONGO_PASS;

	MONGO_PORT = Number.isNaN(Number.parseInt(MONGO_PORT)) ? "27017" : Number.parseInt(MONGO_PORT).toString();

	const uri = MONGO_USER && MONGO_PASS
		? `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}`
		: `mongodb://${MONGO_HOST}:${MONGO_PORT}`;

	return new MongoClient(uri);
}

/**
 * 检查数据库是否存在
 */
async function checkDbExists(dbName) {
	const client = getMongoClient();
	try {
		await client.connect();
		const dblist = await client.db().admin().listDatabases();
		return dblist.databases.some(db => db.name === dbName);
	} catch (error) {
		console.error(`检查数据库时出错: ${error.message}`);
		return false;
	} finally {
		await client.close();
	}
}

/**
 * 从数据库中读取数据
 */
async function readCollection(dbName, collectionName, filter = {}, options = {}) {
	const client = getMongoClient();
	try {
		await client.connect();
		const db = client.db(dbName);
		const collection = db.collection(collectionName);

		// 提取排序选项
		const { sort, ...findOptions } = options;

		// 如果有排序选项，使用sort方法
		if (sort) {
			return await collection.find(filter, findOptions).sort(sort).toArray();
		}

		return await collection.find(filter, findOptions).toArray();
	} catch (error) {
		console.error(`读取数据时出错: ${error.message}`);
		return [];
	} finally {
		await client.close();
	}
}

/**
 * 分析单个集合的结构
 */
async function analyzeCollection(collectionName) {
	try {
		// 读取集合中的后 100 条文档来分析结构
		const documents = await readCollection(DB_NAME, collectionName, {}, {
			limit: 100,
			sort: { _id: -1 }, // 按_id降序排列，获取最新的文档
		});

		if (documents.length === 0) {
			return {
				name: collectionName,
				documentCount: 0,
				fields: [],
				sampleDocument: null,
				indexes: [],
			};
		}

		// 分析字段结构
		const fieldTypes = new Map();
		const fieldFrequency = new Map();

		documents.forEach((doc) => {
			Object.keys(doc).forEach((field) => {
				const value = doc[field];
				const type = getValueType(value);

				// 记录字段类型
				if (!fieldTypes.has(field)) {
					fieldTypes.set(field, new Set());
				}
				fieldTypes.get(field).add(type);

				// 记录字段出现频率
				fieldFrequency.set(field, (fieldFrequency.get(field) || 0) + 1);
			});
		});

		// 生成字段信息
		const fields = Array.from(fieldTypes.entries()).map(([field, types]) => ({
			name: field,
			types: Array.from(types),
			frequency: fieldFrequency.get(field),
			required: fieldFrequency.get(field) === documents.length,
			description: getFieldDescription(field, types),
		}));

		// 获取一个示例文档（去除 _id 字段）
		const sampleDoc = { ...documents[0] };
		delete sampleDoc._id;

		return {
			name: collectionName,
			documentCount: documents.length,
			fields: fields.sort((a, b) => b.frequency - a.frequency),
			sampleDocument: sampleDoc,
			indexes: [], // MongoDB 索引信息需要单独查询
		};
	} catch (error) {
		console.error(`分析集合 ${collectionName} 时出错:`, error.message);
		return {
			name: collectionName,
			documentCount: 0,
			fields: [],
			sampleDocument: null,
			indexes: [],
			error: error.message,
		};
	}
}

/**
 * 获取值的类型
 */
function getValueType(value) {
	if (value === null || value === undefined)
		return "null";
	if (Array.isArray(value))
		return "array";
	if (value instanceof Date)
		return "date";
	if (typeof value === "object")
		return "object";
	return typeof value;
}

/**
 * 根据字段名和类型生成描述
 */
function getFieldDescription(field, types) {
	const typeStr = Array.from(types).join(" | ");

	// 常见字段的描述
	const descriptions = {
		email: "用户邮箱地址",
		passwordHash: "加密后的密码",
		token: "访问令牌",
		session: "会话标识",
		createdAt: "创建时间",
		updatedAt: "更新时间",
		expiresAt: "过期时间",
		used: "是否已使用",
		isActive: "是否激活",
		articleText: "文章内容",
		result: "分析结果",
		mode: "分析模式",
		overallScore: "综合评分",
		sha1: "内容哈希值",
		ip: "IP地址",
		fingerprint: "浏览器指纹",
		codeHash: "验证码哈希",
		orderNumber: "订单号",
		orderTime: "订单时间",
		userIp: "用户IP",
		browserFingerprint: "浏览器指纹",
		firstIssuedTime: "首次签发时间",
		lastFingerprintUpdateTime: "最后指纹更新时间",
		dayKey: "日期键",
		type: "类型标识",
		key: "标识值",
	};

	return descriptions[field] || `${field} (${typeStr})`;
}

/**
 * 生成 Markdown 格式的集合文档
 */
function generateCollectionMarkdown(collectionInfo) {
	const { name, documentCount, fields, sampleDocument, error } = collectionInfo;

	if (error) {
		return `### ${name} - 错误\n\n集合分析失败：${error}\n\n`;
	}

	let markdown = `### ${name} - ${getCollectionDisplayName(name)}\n\n`;

	if (documentCount === 0) {
		markdown += "*集合暂无数据*\n\n";
		return markdown;
	}

	markdown += `**文档数量**: ${documentCount}\n\n`;

	// 字段结构表格
	markdown += "**字段结构：**\n\n";
	markdown += "| 字段名 | 类型 | 必填 | 描述 |\n";
	markdown += "|--------|------|------|------|\n";

	fields.forEach((field) => {
		const types = field.types.join(" | ");
		const required = field.required ? "是" : "否";
		markdown += `| ${field.name} | ${types} | ${required} | ${field.description} |\n`;
	});

	markdown += "\n";

	// 示例文档
	if (sampleDocument) {
		markdown += "**示例文档：**\n\n";
		markdown += "```typescript\n";
		markdown += JSON.stringify(sampleDocument, null, 2);
		markdown += "\n```\n\n";
	}

	return markdown;
}

/**
 * 获取集合的显示名称
 */
function getCollectionDisplayName(collectionName) {
	const displayNames = {
		users: "用户表",
		analysis_requests: "分析请求表",
		api_keys: "API 密钥表",
		email_verification_codes: "邮箱验证码表",
		sessions: "会话表",
		daily_usage: "每日使用统计表",
	};

	return displayNames[collectionName] || collectionName;
}

/**
 * 主函数
 */
async function main() {
	try {
		console.log("开始分析数据库结构...");

		// 检查数据库是否存在
		const dbExists = await checkDbExists(DB_NAME);
		if (!dbExists) {
			console.error(`数据库 ${DB_NAME} 不存在`);
			process.exit(1);
		}

		console.log(`正在分析数据库 ${DB_NAME} 的集合结构...`);

		// 分析所有集合
		const collectionInfos = [];
		for (const collectionName of COLLECTIONS) {
			console.log(`正在分析集合: ${collectionName}`);
			const info = await analyzeCollection(collectionName);
			collectionInfos.push(info);
		}

		// 生成完整的 Markdown 文档
		let markdown = `---\n`;
		markdown += `description: 数据库表结构和数据类型规范（自动生成）\n`;
		markdown += `globs: "**/src/**/*.{ts,tsx}"\n`;
		markdown += `alwaysApply: true\n`;
		markdown += `---\n\n`;

		markdown += `## 数据库概览\n\n`;
		markdown += `项目使用 MongoDB 作为数据库，数据库名为 \`${DB_NAME}\`。\n\n`;
		markdown += `> ⚠️ **注意**: 此文档由脚本自动生成，反映了数据库中的实际数据结构。\n\n`;

		markdown += `## 集合（表）结构\n\n`;

		collectionInfos.forEach((info) => {
			markdown += generateCollectionMarkdown(info);
		});

		// 添加数据访问规范
		markdown += `## 数据访问规范\n\n`;
		markdown += `1. **统一入口**: 所有数据库操作必须通过 \`src/lib/db.ts\` 中的函数进行\n`;
		markdown += `2. **连接管理**: 使用连接池，自动管理连接生命周期\n`;
		markdown += `3. **错误处理**: 所有数据库操作都必须包含适当的错误处理\n`;
		markdown += `4. **数据验证**: 在写入数据库前进行数据验证\n`;
		markdown += `5. **安全性**: 敏感信息（如密码、验证码）必须加密存储\n\n`;

		// 输出到控制台
		console.log("\n=== 生成的数据库文档 ===\n");
		console.log(markdown);

		// 直接更新文件
		const filePath = path.join(process.cwd(), "database.mdc");

		try {
			fs.writeFileSync(filePath, markdown, "utf8");
			console.log(`\n✅ 文件已更新: ${filePath}`);
		} catch (error) {
			console.error(`❌ 更新文件失败:`, error.message);
		}

		process.exit(0);
	} catch (error) {
		console.error("脚本执行失败:", error);
		process.exit(1);
	}
}

// 运行主函数
main();
