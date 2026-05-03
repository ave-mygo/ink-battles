import type { ClientSession, Document, Filter, FindOneAndUpdateOptions, FindOptions, OptionalUnlessRequiredId, UpdateFilter, WithId } from "mongodb";
import { MongoClient, ObjectId } from "mongodb";
import { getConfig } from "../config";

let cachedClient: MongoClient | null = null;
let connectingClient: Promise<MongoClient> | null = null;

const MONGO_URI_CREDENTIALS_REGEX = /\/\/([^:/?#]+):([^@/?#]+)@/u;

export const DB_NAME = "ink_battles";
export const COLLECTIONS = {
	analysisRequests: "analysis_requests",
	analysisTasks: "analysis_tasks",
	userBilling: "user_billing",
	promoCodes: "promo_codes",
	promoCodeRedemptions: "promo_code_redemptions",
	afdOrders: "afd_orders",
	users: "users",
	afdUsers: "afd_users",
	sessions: "sessions",
	emailCodes: "email_verification_codes",
	inviteCodes: "invite_codes",
	rateLimits: "rate_limits",
	authSessions: "auth_sessions",
	auditLogs: "audit_logs",
} as const;

export const objectId = (id: string) => new ObjectId(id);
export const isObjectId = (id: string) => ObjectId.isValid(id);

export const redactMongoUri = (uri: string) =>
	uri.replace(MONGO_URI_CREDENTIALS_REGEX, "//$1:***@");

export const mongoClient = async () => {
	if (cachedClient)
		return cachedClient;
	if (connectingClient)
		return connectingClient;

	const { mongodb } = getConfig();
	const directConnection = mongodb.directConnection !== false;
	const credential = mongodb.user && mongodb.password ? `${mongodb.user}:${mongodb.password}@` : "";
	const uri = `mongodb://${credential}${mongodb.host}:${mongodb.port}/?directConnection=${directConnection}`;

	connectingClient = new MongoClient(uri, {
		maxPoolSize: 10,
		minPoolSize: 2,
		serverSelectionTimeoutMS: 15000,
		socketTimeoutMS: 45000,
	}).connect().catch((error) => {
		console.error(`[mongo] 连接失败 uri=${redactMongoUri(uri)}`, error);
		throw error;
	});

	cachedClient = await connectingClient;
	return cachedClient;
};

export const collection = async <T extends Document = Document>(name: string) => {
	const client = await mongoClient();
	return client.db(DB_NAME).collection<T>(name);
};

export const ensureCollectionExists = async (name: string) => {
	const client = await mongoClient();
	const database = client.db(DB_NAME);
	const existed = await database.listCollections({ name }, { nameOnly: true }).hasNext();
	if (!existed) {
		await database.createCollection(name);
	}
};

export const findOne = async <T extends Document>(name: string, filter: Filter<T>) =>
	(await collection<T>(name)).findOne(filter);

export const findMany = async <T extends Document>(name: string, filter: Filter<T>, options: FindOptions = {}) =>
	(await collection<T>(name)).find(filter, options).toArray();

export const insertOne = async <T extends Document>(name: string, data: OptionalUnlessRequiredId<T>, session?: ClientSession) => {
	await (await collection<T>(name)).insertOne(data, session ? { session } : undefined);
	return true;
};

export const updateOne = async <T extends Document>(name: string, filter: Filter<T>, data: UpdateFilter<T> | Partial<T>, session?: ClientSession) => {
	const update = Object.keys(data).some(key => key.startsWith("$")) ? data : { $set: data };
	const result = await (await collection<T>(name)).updateOne(filter, update as UpdateFilter<T>, session ? { session } : undefined);
	return result.modifiedCount > 0 || result.matchedCount > 0;
};

export const updateMany = async <T extends Document>(name: string, filter: Filter<T>, data: UpdateFilter<T> | Partial<T>, session?: ClientSession) => {
	const update = Object.keys(data).some(key => key.startsWith("$")) ? data : { $set: data };
	const result = await (await collection<T>(name)).updateMany(filter, update as UpdateFilter<T>, session ? { session } : undefined);
	return result.modifiedCount;
};

export const findOneAndUpdate = async <T extends Document>(
	name: string,
	filter: Filter<T>,
	update: UpdateFilter<T>,
	options: FindOneAndUpdateOptions = {},
) =>
	(await collection<T>(name)).findOneAndUpdate(filter, update, { returnDocument: "after", ...options }) as Promise<WithId<T> | null>;

export const deleteOne = async <T extends Document>(name: string, filter: Filter<T>) =>
	(await collection<T>(name)).deleteOne(filter).then(result => result.deletedCount > 0);

export const count = async <T extends Document>(name: string, filter: Filter<T>) =>
	(await collection<T>(name)).countDocuments(filter);

export const ensureTtlIndex = async (name: string, field: string, expireAfterSeconds: number) => {
	await (await collection(name)).createIndex({ [field]: 1 }, { expireAfterSeconds });
};

export const withTransaction = async <T>(callback: (session: ClientSession) => Promise<T>) => {
	const client = await mongoClient();
	const session = client.startSession();
	try {
		let value!: T;
		await session.withTransaction(async () => {
			value = await callback(session);
		});
		return value;
	} finally {
		await session.endSession();
	}
};
