import crypto from "node:crypto";

export const generateSessionId = (length = 12) => {
	const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz${Date.now().toString()}`;
	const bytes = crypto.randomBytes(length);
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}
	return result;
};
