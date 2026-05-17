import process from "node:process";

const API_PREFIX = "/api/v2";
const TRAILING_SLASH_REGEX = /\/$/;
const API_PREFIX_REGEX = /\/api\/v2\/?$/;

const normalizeApiHost = (baseUrl: string) =>
  baseUrl
    .trim()
    .replace(TRAILING_SLASH_REGEX, "")
    .replace(API_PREFIX_REGEX, "");

/**
 * 统一解析 Eden 需要的 host。
 *
 * Eden 会自行拼接完整路由树，所以这里必须去掉 `/api/v2` 前缀。
 */
export const getClientApiHost = () => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeApiHost(configuredBaseUrl);
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:3001";
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

/**
 * 统一解析服务端访问后端时使用的 host。
 */
export const getServerApiHost = () => normalizeApiHost(
  process.env.INTERNAL_API_BASE_URL || `http://localhost:3001${API_PREFIX}`,
);
