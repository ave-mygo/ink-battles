# Ink Battles Auth Panel

这是 `@ink-battles/auth-service` 的 SSG 前端面板。

面板只负责登录、注册、找回密码、邮箱验证结果和会话管理界面；所有认证业务逻辑由 `apps/auth` 下的 Rust Axum 服务提供。

## 开发

```bash
pnpm --filter @ink-battles/auth-panel dev
```

单独开发面板时会运行在 `http://localhost:3101`，并通过 `NEXT_PUBLIC_AUTH_API_BASE_URL` 调用 Rust 认证服务。

## 构建

```bash
pnpm --filter @ink-battles/auth-panel build
```

构建产物输出到 `out/`，再由 Rust 服务构建时嵌入二进制。
