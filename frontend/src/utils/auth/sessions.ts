// eslint-disable-next-line unicorn/prefer-node-protocol
import crypto from "crypto";

export const generateSessionId = (length = 12) => {
	const rawChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz${Date.now().toString()}`;
	const seen = new Set();
	let chars = "";
	for (const c of rawChars) {
		if (!seen.has(c)) {
			seen.add(c);
			chars += c;
		}
	}
	const bytes = crypto.randomBytes(length);
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}
	return result;
};

export default generateSessionId;
