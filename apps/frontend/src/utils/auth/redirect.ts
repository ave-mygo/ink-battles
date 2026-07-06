import "server-only";

const DEFAULT_AUTH_BASE_URL = "http://localhost:3100";
const DEFAULT_RETURN_PATH = "/dashboard";

/**
 * 获取授权服务前端入口地址。
 */
export const getAuthBaseUrl = (): string =>
  (process.env.AUTH_BASE_URL || process.env.NEXT_PUBLIC_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL).replace(/\/$/, "");

/**
 * 生成跳转至授权服务的 URL。
 */
export const createAuthRedirectUrl = (path: "/" | "/register" | "/forgot-password", returnTo?: string): string => {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const target = new URL(path, getAuthBaseUrl());
  target.searchParams.set("returnTo", returnTo || `${siteUrl}${DEFAULT_RETURN_PATH}`);
  return target.toString();
};

