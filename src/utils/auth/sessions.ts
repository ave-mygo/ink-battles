// eslint-disable-next-line unicorn/prefer-node-protocol
import crypto from "crypto";

export const generateSessionId = (length = 12) => {
	const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz${Date.now().toString()}`;
	const bytes = crypto.randomBytes(length);
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}
	return result;
};

export default generateSessionId;
