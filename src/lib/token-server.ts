import crypto from "node:crypto";
import process from "node:process";
import dotenv from "dotenv";
import md5 from "md5";
import { db_find, db_insert, db_update } from "./db";

dotenv.config();

const API_TOKEN = process.env.AFDIAN_API_TOKEN;
const USER_ID = process.env.AFDIAN_USER_ID;
const TOKEN_SECRET = process.env.TOKEN_SECRET || "default-secret-key";

// 数据库和集合名称
const DB_NAME = "ink_battles";
const COLLECTION_NAME = "api_keys";

/**
 * API Key 数据结构
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

/**
 * 验证订单号是否有效
 * 通过爱发电订单查询API验证订单是否存在且已支付
 *
 * @param orderNumber - 订单号
 * @returns 是否为有效订单
 */
export async function verifyOrderNumber(orderNumber: string): Promise<boolean> {
	try {
		// 使用爱发电订单查询API直接查询指定订单号
		const result = await queryOrderByNumber(orderNumber);

		if (result.success && result.order) {
			// 验证订单状态：2表示已支付
			return result.order.status === 2;
		}

		return false;
	} catch (error) {
		console.error("验证订单号失败:", error);
		return false;
	}
}

/**
 * 生成或更新API Token
 * 支持通过订单号或旧token进行更新
 *
 * @param identifier - 订单号或旧token
 * @param browserFingerprint - 浏览器指纹
 * @param userIp - 用户IP地址
 * @param orderTime - 订单时间（仅在新建时需要）
 * @returns 生成的token和操作结果
 */
export async function generateOrUpdateToken(
	identifier: string,
	browserFingerprint: string,
	userIp: string,
	orderTime?: Date,
): Promise<{ success: boolean; token?: string; message?: string; isUpdate?: boolean }> {
	try {
		// 检查是否为现有token更新
		let existingRecord = await findApiKeyByToken(identifier);
		let isUpdate = false;

		if (!existingRecord) {
			// 检查是否为订单号
			existingRecord = await findApiKeyByOrderNumber(identifier);
		}

		if (existingRecord) {
			isUpdate = true;
			// 使旧token失效
			await deactivateOldTokens(existingRecord.orderNumber);
		}

		// 生成新token
		const timestamp = Date.now();
		const randomBytes = crypto.randomBytes(16).toString("hex");
		const data = `${identifier}-${timestamp}-${randomBytes}-${TOKEN_SECRET}`;
		const newToken = crypto.createHash("sha256").update(data).digest("hex");

		// 准备保存的数据
		const apiKeyData = {
			orderNumber: existingRecord?.orderNumber || identifier,
			orderTime: existingRecord?.orderTime || orderTime || new Date(),
			firstIssuedTime: existingRecord?.firstIssuedTime || new Date(),
			lastFingerprintUpdateTime: new Date(),
			userIp,
			token: newToken,
			browserFingerprint,
			isActive: true,
		};

		// 保存到数据库
		const saved = await saveApiKey(apiKeyData);

		if (!saved) {
			return {
				success: false,
				message: "保存Token到数据库失败",
			};
		}

		return {
			success: true,
			token: newToken,
			message: isUpdate ? "Token更新成功" : "Token生成成功",
			isUpdate,
		};
	} catch (error) {
		console.error("生成或更新Token失败:", error);
		return {
			success: false,
			message: "生成Token时发生错误",
		};
	}
}

/**
 * 通过订单号查询订单信息
 * 使用爱发电订单查询API
 *
 * @param orderNumber - 订单号
 * @returns 订单查询结果
 */
export async function queryOrderByNumber(orderNumber: string) {
	const ts = Math.floor(Date.now() / 1000);
	const params = JSON.stringify({ out_trade_no: orderNumber });
	const sign = md5(`${API_TOKEN}params${params}ts${ts}user_id${USER_ID}`);

	const response = await fetch("https://afdian.com/api/open/query-order", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			user_id: USER_ID,
			params,
			ts,
			sign,
		}),
	});

	const data = await response.json();

	if (!response.ok) {
		return {
			success: false,
			message: "API请求失败",
			order: null,
		};
	}

	// 检查爱发电API的响应格式
	if (data.ec !== 200) {
		return {
			success: false,
			message: data.em || "订单查询失败",
			order: null,
		};
	}

	// 检查是否找到订单
	if (!data.data || !data.data.list || data.data.list.length === 0) {
		return {
			success: false,
			message: "未找到该订单号的记录",
			order: null,
		};
	}

	// 返回第一个订单记录
	const order = data.data.list[0];

	return {
		success: true,
		message: "订单查询成功",
		order,
	};
}

/**
 * 保存或更新API Key记录
 * 如果订单号已存在，则更新记录；否则创建新记录
 *
 * @param apiKeyData - API Key数据
 * @returns 操作是否成功
 */
export async function saveApiKey(apiKeyData: Omit<ApiKeyRecord, "_id">): Promise<boolean> {
	try {
		// 检查是否已存在该订单号的记录
		const existingRecord = await db_find(DB_NAME, COLLECTION_NAME, {
			orderNumber: apiKeyData.orderNumber,
		});

		if (existingRecord) {
			// 更新现有记录，保留首次签发时间
			const updateData = {
				...apiKeyData,
				firstIssuedTime: existingRecord.firstIssuedTime, // 保留原始签发时间
				lastFingerprintUpdateTime: new Date(), // 更新指纹更新时间
			};

			return await db_update(
				DB_NAME,
				COLLECTION_NAME,
				{ orderNumber: apiKeyData.orderNumber },
				updateData,
			);
		} else {
			// 创建新记录
			const newRecord = {
				...apiKeyData,
				firstIssuedTime: new Date(),
				lastFingerprintUpdateTime: new Date(),
				isActive: true,
			};

			return await db_insert(DB_NAME, COLLECTION_NAME, newRecord);
		}
	} catch (error) {
		console.error("保存API Key失败:", error);
		return false;
	}
}

/**
 * 通过订单号查找API Key记录
 *
 * @param orderNumber - 订单号
 * @returns API Key记录或null
 */
export async function findApiKeyByOrderNumber(orderNumber: string): Promise<ApiKeyRecord | null> {
	try {
		return await db_find(DB_NAME, COLLECTION_NAME, {
			orderNumber,
			isActive: true,
		});
	} catch (error) {
		console.error("查找API Key失败:", error);
		return null;
	}
}

/**
 * 通过token查找API Key记录
 *
 * @param token - API Token
 * @returns API Key记录或null
 */
export async function findApiKeyByToken(token: string): Promise<ApiKeyRecord | null> {
	try {
		return await db_find(DB_NAME, COLLECTION_NAME, {
			token,
			isActive: true,
		});
	} catch (error) {
		console.error("查找API Key失败:", error);
		return null;
	}
}

/**
 * 验证token是否有效
 * 检查token格式、数据库记录和浏览器指纹
 *
 * @param token - 要验证的token
 * @param browserFingerprint - 浏览器指纹
 * @param userIp - 用户IP地址
 * @returns 验证结果
 */
export async function validateApiKey(
	token: string,
	browserFingerprint: string,
	userIp: string,
): Promise<{ valid: boolean; record?: ApiKeyRecord; reason?: string }> {
	try {
		// 基本格式验证
		if (!token || typeof token !== "string") {
			return { valid: false, reason: "Token格式无效" };
		}

		// 检查token是否为64位十六进制字符串（SHA256输出格式）
		const tokenPattern = /^[a-f0-9]{64}$/i;
		if (!tokenPattern.test(token)) {
			return { valid: false, reason: "Token格式不正确" };
		}

		// 查找数据库记录
		const record = await findApiKeyByToken(token);
		if (!record) {
			return { valid: false, reason: "Token不存在或已失效" };
		}

		// 验证浏览器指纹
		if (record.browserFingerprint !== browserFingerprint) {
			return { valid: false, reason: "浏览器指纹不匹配，请尝试重新获取Token" };
		}

		// 更新最后使用时间和IP（如果IP发生变化）
		if (record.userIp !== userIp) {
			await db_update(
				DB_NAME,
				COLLECTION_NAME,
				{ token },
				{
					userIp,
					lastFingerprintUpdateTime: new Date(),
				},
			);
		}

		return { valid: true, record };
	} catch (error) {
		console.error("验证API Key失败:", error);
		return { valid: false, reason: "验证过程中发生错误" };
	}
}

/**
 * 使旧token失效
 *
 * @param orderNumber - 订单号
 * @returns 操作是否成功
 */
export async function deactivateOldTokens(orderNumber: string): Promise<boolean> {
	try {
		return await db_update(
			DB_NAME,
			COLLECTION_NAME,
			{ orderNumber, isActive: true },
			{ isActive: false },
		);
	} catch (error) {
		console.error("使旧token失效失败:", error);
		return false;
	}
}

/**
 * 更新浏览器指纹
 *
 * @param token - API Token
 * @param browserFingerprint - 新的浏览器指纹
 * @param userIp - 用户IP
 * @returns 操作是否成功
 */
export async function updateBrowserFingerprint(
	token: string,
	browserFingerprint: string,
	userIp: string,
): Promise<boolean> {
	try {
		return await db_update(
			DB_NAME,
			COLLECTION_NAME,
			{ token, isActive: true },
			{
				browserFingerprint,
				userIp,
				lastFingerprintUpdateTime: new Date(),
			},
		);
	} catch (error) {
		console.error("更新浏览器指纹失败:", error);
		return false;
	}
}

/**
 * 验证token是否有效（简化版本）
 * 这个函数可以用于验证用户提交的token
 *
 * @param token - 要验证的token
 * @returns 是否为有效token
 */
export async function validateToken(token: string): Promise<boolean> {
	// 这里可以实现token验证逻辑
	// 例如：检查token格式、查询数据库中的token记录等
	// 目前简化处理，检查token格式

	if (!token || typeof token !== "string") {
		return false;
	}

	// 检查token是否为64位十六进制字符串（SHA256输出格式）
	const tokenPattern = /^[a-f0-9]{64}$/i;
	return tokenPattern.test(token);
}
