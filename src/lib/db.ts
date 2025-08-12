// eslint-disable-next-line unicorn/prefer-node-protocol
import process from "process";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const runtimeEnv = {
	MONGO_HOST: process.env.MONGO_HOST,
	MONGO_PORT: process.env.MONGO_PORT,
	MONGO_USER: process.env.MONGO_USER,
	MONGO_PASS: process.env.MONGO_PASS,
};

/**
 * 创建并返回一个 MongoDB 客户端实例。
 * @returns {MongoClient} MongoDB 客户端实例
 */
function mongoClient(): MongoClient {
	const MONGO_HOST = runtimeEnv.MONGO_HOST || "192.168.3.4";
	let MONGO_PORT: string = (runtimeEnv.MONGO_PORT || 27017).toString();
	const MONGO_USER = runtimeEnv.MONGO_USER;
	const MONGO_PASS = runtimeEnv.MONGO_PASS;

	MONGO_PORT = Number.isNaN(Number.parseInt(MONGO_PORT)) ? "27017" : Number.parseInt(MONGO_PORT).toString();

	const uri = MONGO_USER && MONGO_PASS
		? `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}`
		: `mongodb://${MONGO_HOST}:${MONGO_PORT}`;

	return new MongoClient(uri);
}

/**
 * 带有超时机制的连接函数。
 * @param {MongoClient} client - MongoDB 客户端实例
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<void>} 连接成功或超时错误
 */
async function connectWithTimeout(client: MongoClient, timeout: number = 5000): Promise<void> {
	return Promise.race<void>([
		client.connect().then(() => undefined),
		new Promise<void>((_, reject) => setTimeout(() => reject(new Error("连接数据库超时")), timeout)),
	]).catch((error: unknown) => {
		throw error instanceof Error ? error : new Error(String(error));
	});
}

/**
 * 检查数据库是否存在。
 * @param {string} dbName - 数据库名称
 * @returns {Promise<boolean>} 如果数据库存在则返回 true，否则返回 false
 */
export async function check_db(dbName: string): Promise<boolean> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const dblist = await client.db().admin().listDatabases();
		return dblist.databases.some(db => db.name === dbName);
	} catch (error) {
		console.error(`检查数据库时出错: ${(error as Error).message}`);
		return false;
	} finally {
		await client.close();
	}
}

/**
 * 从数据库中读取数据。
 * @param {string} dbName - 数据库名称
 * @param {string} collectionName - 集合名称
 * @param {object} [filter] - 查询过滤器
 * @param {object} [options] - 查询选项，包括分页和排序
 * @returns {Promise<Array>} 返回查询到的数据数组
 */
export async function db_read(dbName: string, collectionName: string, filter: object = {}, options: object = {}): Promise<any[]> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const db = client.db(dbName);
		const collection = db.collection(collectionName);
		return await collection.find(filter, options).toArray();
	} catch (error) {
		console.error(`读取数据时出错: ${(error as Error).message}`);
		return [];
	} finally {
		await client.close();
	}
}

/**
 * 向数据库中插入数据。
 * @param {string} dbName - 数据库名称
 * @param {string} collectionName - 集合名称
 * @param {object} data - 要插入的数据
 * @returns {Promise<boolean>} 如果插入成功则返回 true
 */
export async function db_insert(dbName: string, collectionName: string, data: object): Promise<boolean> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const db = client.db(dbName);
		const collection = db.collection(collectionName);
		await collection.insertOne(data);
		return true;
	} catch (error) {
		console.error(`插入数据时出错: ${(error as Error).message}`);
		return false;
	} finally {
		await client.close();
	}
}

/**
 * 在数据库中查找数据。
 * @param {string} dbName - 数据库名称
 * @param {string} collectionName - 集合名称
 * @param {object} data - 查找条件
 * @returns {Promise<object | null>} 返回查找到的数据，如果没有找到则返回 null
 */
export async function db_find(dbName: string, collectionName: string, data: object): Promise<any | null> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const db = client.db(dbName);
		const collection = db.collection(collectionName);
		return await collection.findOne(data);
	} catch (error) {
		console.error(`查找数据时出错: ${(error as Error).message}`);
		return null;
	} finally {
		await client.close();
	}
}

/**
 * 更新数据库中的数据。
 * @param {string} dbName - 数据库名称
 * @param {string} collectionName - 集合名称
 * @param {object} query - 查询条件
 * @param {object} data - 更新的数据
 * @returns {Promise<boolean>} 如果更新成功则返回 true
 */
export async function db_update(dbName: string, collectionName: string, query: object, data: object): Promise<boolean> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const db = client.db(dbName);
		const collection = db.collection(collectionName);

		// 检查data是否已经包含MongoDB更新操作符
		const hasUpdateOperators = Object.keys(data).some(key => key.startsWith("$"));

		if (hasUpdateOperators) {
			// 如果包含更新操作符，直接使用data
			await collection.updateOne(query, data);
		} else {
			// 如果不包含更新操作符，使用$set包装
			await collection.updateOne(query, { $set: data });
		}

		return true;
	} catch (error) {
		console.error(`更新数据时出错: ${(error as Error).message}`);
		return false;
	} finally {
		await client.close();
	}
}

/**
 * 删除数据库中的数据。
 * @param {string} dbName - 数据库名称
 * @param {string} collectionName - 集合名称
 * @param {object} query - 删除条件
 * @returns {Promise<boolean>} 如果删除成功则返回 true
 */
export async function db_delete(dbName: string, collectionName: string, query: object): Promise<boolean> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const db = client.db(dbName);
		const collection = db.collection(collectionName);
		await collection.deleteOne(query);
		return true;
	} catch (error) {
		console.error(`删除数据时出错: ${(error as Error).message}`);
		return false;
	} finally {
		await client.close();
	}
}

/**
 * 获取数据库中某一集合的文档总数
 * @param {string} dbName - 数据库名称
 * @param {string} collectionName - 集合名称
 * @param {object} [filter] - 查询过滤器
 * @returns {Promise<number>} 返回集合中的文档总数
 */
export async function db_count(dbName: string, collectionName: string, filter: object = {}): Promise<number> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const db = client.db(dbName);
		const collection = db.collection(collectionName);
		return await collection.countDocuments(filter);
	} catch (error) {
		console.error(`获取文档总数时出错: ${(error as Error).message}`);
		return 0;
	} finally {
		await client.close();
	}
}

/**
 * 从数据库中获取某个字段的所有唯一值
 * @param {string} dbName - 数据库名称
 * @param {string} collectionName - 集合名称
 * @param {string} fieldName - 需要获取唯一值的字段名
 * @returns {Promise<Array>} 返回包含所有唯一字段值的数组
 */
export async function db_getUniqueFieldValues(dbName: string, collectionName: string, fieldName: string): Promise<any[]> {
	const client = mongoClient();
	try {
		await connectWithTimeout(client);
		const db = client.db(dbName);
		const collection = db.collection(collectionName);
		const result = await collection.aggregate([
			{ $match: { [fieldName]: { $exists: true } } },
			{ $group: { _id: `$${fieldName}` } },
			{ $project: { _id: 0, value: "$_id" } },
		]).toArray();
		return result.map(item => item.value);
	} catch (error) {
		console.error(`获取唯一字段值时出错: ${(error as Error).message}`);
		return [];
	} finally {
		await client.close();
	}
}
