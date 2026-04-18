export const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/u;
const LOWERCASE_REGEX = /[a-z]/;
const UPPERCASE_REGEX = /[A-Z]/;
const DIGIT_REGEX = /\d/;
const SPECIAL_CHARACTER_REGEX = /[^a-z\d]/i;

export const normalizeEmail = (email: unknown) =>
	typeof email === "string" ? email.trim().toLowerCase() : "";

export const isPasswordValid = (password: string): boolean => {
	if (password.length < 10)
		return false;
	const checks = [
		LOWERCASE_REGEX.test(password),
		UPPERCASE_REGEX.test(password),
		DIGIT_REGEX.test(password),
		SPECIAL_CHARACTER_REGEX.test(password),
	];
	return checks.filter(Boolean).length >= 3;
};

export const normalizeString = (value: unknown) => typeof value === "string" ? value.trim() : "";
