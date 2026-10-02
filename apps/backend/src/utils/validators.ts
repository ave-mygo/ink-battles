export const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/u;
const LOWERCASE_REGEX = /[a-z]/;
const UPPERCASE_REGEX = /[A-Z]/;
const DIGIT_REGEX = /\d/;
const SPECIAL_CHARACTER_REGEX = /[^a-z\d]/i;

/**
 * 规范化邮箱地址，去除首尾空格并转为小写
 * @param email - 待规范化的邮箱
 * @returns 规范化后的邮箱字符串
 */
export function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * 验证密码是否符合强度要求
 * @param password - 待验证的密码
 * @returns 密码是否有效（长度至少 10 位，且包含大小写字母、数字、特殊字符中的至少 3 种）
 */
export function isPasswordValid(password: string): boolean {
  if (password.length < 10)
    return false;
  const checks = [
    LOWERCASE_REGEX.test(password),
    UPPERCASE_REGEX.test(password),
    DIGIT_REGEX.test(password),
    SPECIAL_CHARACTER_REGEX.test(password),
  ];
  return checks.filter(Boolean).length >= 3;
}

/**
 * 规范化字符串，去除首尾空格
 * @param value - 待规范化的值
 * @returns 规范化后的字符串，非字符串类型返回空字符串
 */
export const normalizeString = (value: unknown) => typeof value === "string" ? value.trim() : "";
