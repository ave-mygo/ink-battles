---
name: ink-auth-integration
description: Integrate services with the Ink Battles unified Rust Axum authentication service, including deployment, environment variables, API contracts, session cookies, callbacks, and frontend wiring.
user-invocable: true
---

# Ink Battles 统一认证接入 Skill

当需要让任意业务系统接入 Ink Battles 统一认证服务时，使用本 Skill。

## 1. 服务边界

统一认证服务由 `apps/auth/panel/` 和 `apps/auth/` 组成：

1. `apps/auth/panel/` 是 Next.js SSG 面板，仅负责登录、注册、忘记密码、重置密码、邮箱验证码、邮箱验证结果和会话管理界面。
2. `apps/auth/` 是 Rust Axum 服务 app package 根目录，负责认证 API、会话写入、JWT 签发、Cookie 写入、邮件发送和静态产物托管。
3. 业务系统不再实现认证表单，只负责把用户跳转到授权站，并在回调后用同一个 `auth-token` Cookie 恢复登录态。

## 2. Dev 与 Release URL

Dev 默认：

```plaintext
Auth API/Page: http://localhost:3100
Auth Panel Dev: http://localhost:3101
Ink Battles Site: http://localhost:3000
Backend API: http://localhost:3001
```

Release 推荐：

```plaintext
Auth API/Page: https://auth.ink-battles.couqie.moe
Ink Battles Site: https://ink-battles.couqie.moe
Cookie Domain: .couqie.moe
```

Dev 和 Release 必须使用不同的 `AUTH_JWT_SECRET`、MongoDB、SMTP、Cookie Domain 和允许回调 Origin。

## 3. 部署方式

本地构建：

```bash
turbo run build --filter=@ink-battles/auth-service
```

Docker 构建：

```bash
docker build -f apps/auth/Dockerfile -t ink-battles-auth .
```

Docker Compose：

```bash
docker compose up -d auth
```

Axum 服务会把 `apps/auth/panel/out` 静态产物嵌入二进制，因此生产环境只需要部署一个授权服务。

## 4. 环境变量

授权服务核心变量：

```plaintext
AUTH_HOST=0.0.0.0
AUTH_PORT=3100
AUTH_APP_BASE_URL=https://auth.ink-battles.couqie.moe
AUTH_DEFAULT_RETURN_URL=https://ink-battles.couqie.moe/dashboard
AUTH_ALLOWED_RETURN_ORIGINS=https://ink-battles.couqie.moe
AUTH_ALLOWED_ORIGINS=https://ink-battles.couqie.moe,https://auth.ink-battles.couqie.moe
AUTH_COOKIE_NAME=auth-token
AUTH_COOKIE_DOMAIN=.couqie.moe
AUTH_COOKIE_SECURE=true
AUTH_JWT_SECRET=<same-secret-as-business-backend>
AUTH_MONGODB_URI=mongodb://...
AUTH_MONGODB_DATABASE=ink_battles
AUTH_SMTP_HOST=smtp.example.com
AUTH_SMTP_PORT=587
AUTH_SMTP_USER=no-reply@example.com
AUTH_SMTP_PASSWORD=<secret>
AUTH_SMTP_FROM_NAME=Ink Battles
```

业务前端核心变量：

```plaintext
AUTH_BASE_URL=https://auth.ink-battles.couqie.moe
NEXT_PUBLIC_AUTH_BASE_URL=https://auth.ink-battles.couqie.moe
```

业务后端必须与认证服务共享：

```plaintext
JWT_SECRET=<same-as-AUTH_JWT_SECRET>
```

## 5. Cookie 与 Session 配置

认证服务签发 `auth-token` Cookie：

```plaintext
Path=/
HttpOnly
SameSite=Lax
Max-Age=604800
Secure=<AUTH_COOKIE_SECURE>
Domain=<AUTH_COOKIE_DOMAIN when configured>
```

JWT payload：

```json
{
  "uid": 10001,
  "sessionId": "uuid",
  "exp": 1234567890
}
```

服务端会同步写入 MongoDB `auth_sessions` 集合。业务后端验证 JWT 后，还必须检查 `auth_sessions` 中同一个 `uid + sessionId` 未撤销且未过期。

## 6. API 规范

所有 API 均以 `/api/auth` 为前缀，响应结构统一：

```json
{
  "success": true,
  "message": "ok",
  "data": {}
}
```

核心接口：

```plaintext
GET    /api/auth/me
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
POST   /api/auth/refresh-session
POST   /api/auth/send-verification-code
GET    /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/verify-reset-code
POST   /api/auth/reset-password
GET    /api/auth/sessions
DELETE /api/auth/sessions/:sessionId
```

登录请求：

```json
{
  "email": "user@example.com",
  "password": "password",
  "returnTo": "https://ink-battles.couqie.moe/dashboard"
}
```

注册请求只允许四个必要输入加回调地址：

```json
{
  "email": "user@example.com",
  "password": "password",
  "confirmPassword": "password",
  "code": "123456",
  "returnTo": "https://ink-battles.couqie.moe/dashboard"
}
```

## 7. 登录态同步机制

业务系统接入方式：

1. 用户点击登录、注册或忘记密码时，业务前端跳转到授权站。
2. 授权站完成认证后，由 Axum 写入共享域 Cookie。
3. 授权站重定向到 `returnTo`。
4. 业务前端回到原站后，请求业务后端。
5. 业务后端读取同一个 `auth-token` Cookie，并通过 JWT 与 `auth_sessions` 校验用户身份。

不需要 OAuth 授权确认页，也不需要额外授权步骤。

## 8. 业务系统前端接入

登录跳转：

```typescript
const authUrl = new URL("/", process.env.NEXT_PUBLIC_AUTH_BASE_URL);
authUrl.searchParams.set("returnTo", `${window.location.origin}/dashboard`);
window.location.href = authUrl.toString();
```

注册跳转：

```typescript
const authUrl = new URL("/register", process.env.NEXT_PUBLIC_AUTH_BASE_URL);
authUrl.searchParams.set("returnTo", `${window.location.origin}/dashboard`);
window.location.href = authUrl.toString();
```

忘记密码跳转：

```typescript
const authUrl = new URL("/forgot-password", process.env.NEXT_PUBLIC_AUTH_BASE_URL);
authUrl.searchParams.set("returnTo", `${window.location.origin}/dashboard`);
window.location.href = authUrl.toString();
```

## 9. 业务后端接入

业务后端需要实现：

1. 从 Cookie 或 `Authorization: Bearer` 中读取 `auth-token`。
2. 使用 `JWT_SECRET` 验证 HS256 JWT。
3. 读取 `uid` 和 `sessionId`。
4. 查询 `auth_sessions`，确认 `revokedAt` 不存在且 `expiresAt > now`。
5. 查询 `users`，返回业务侧安全用户信息。

Ink Battles 主后端已保留此校验方式，因此授权服务签发的会话可以直接恢复本站登录状态。

## 10. 接入检查清单

1. 业务前端不再保留认证表单。
2. 业务前端登录入口统一跳转授权站。
3. `returnTo` 必须属于 `AUTH_ALLOWED_RETURN_ORIGINS`。
4. 业务后端与授权服务共享 `AUTH_JWT_SECRET/JWT_SECRET`。
5. Release 环境必须配置共享父域 `AUTH_COOKIE_DOMAIN`。
6. Dev 与 Release 的 MongoDB、SMTP、JWT Secret、URL 必须隔离。
7. 业务后端必须校验 `auth_sessions`，不能只校验 JWT 签名。
