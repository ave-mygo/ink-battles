import bcrypt from "bcryptjs";
import { COLLECTIONS, findOne, findOneAndUpdate, insertOne, updateOne } from "../db/mongo";
import { sendVerificationEmail } from "../integrations/mail";
import { EMAIL_REGEX } from "./validators";

export type VerificationType = "register" | "login" | "reset-password";

const VERIFICATION_CODE_TTL_MS = 5 * 60 * 1000;

export const normalizeVerificationType = (value?: string): VerificationType =>
	value === "login" || value === "reset-password" ? value : "register";

export const consumeEmailCode = async (email: string, code: string, type: VerificationType) => {
	const now = new Date();
	const record = await findOne(COLLECTIONS.emailCodes, {
		email,
		type,
		used: false,
		expiresAt: { $gt: now },
	});
	if (!record)
		return { success: false, message: "验证码不存在或已过期，请重新发送" };
	if (!await bcrypt.compare(code, record.codeHash as string))
		return { success: false, message: "验证码错误" };

	const consumed = await findOneAndUpdate(COLLECTIONS.emailCodes, {
		_id: record._id,
		used: false,
		expiresAt: { $gt: now },
	}, {
		$set: {
			used: true,
			usedAt: now,
		},
	}, { returnDocument: "before" });

	if (!consumed)
		return { success: false, message: "验证码已被使用，请重新发送" };
	return { success: true, message: "验证码校验通过" };
};

export const sendEmailCode = async (email: string, type: VerificationType) => {
	if (!EMAIL_REGEX.test(email))
		return { success: false, message: "请输入有效的邮箱地址" };
	const code = Math.floor(100000 + Math.random() * 900000).toString();
	const codeHash = await bcrypt.hash(code, 10);
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + VERIFICATION_CODE_TTL_MS);
	const existed = await findOne(COLLECTIONS.emailCodes, { email, type, used: false });
	if (existed) {
		await updateOne(COLLECTIONS.emailCodes, { _id: existed._id }, { codeHash, createdAt, expiresAt });
	} else {
		await insertOne(COLLECTIONS.emailCodes, { email, type, codeHash, createdAt, expiresAt, used: false });
	}
	return sendVerificationEmail(email, code, type);
};
