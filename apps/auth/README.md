# Ink Battles Auth

`apps/auth` 是统一认证服务应用，Rust Axum 服务位于应用根目录，SSG 面板位于 `apps/auth/panel`。

```bash
turbo run build --filter=@ink-battles/auth-service
pnpm --filter @ink-battles/auth-service dev
pnpm --filter @ink-battles/auth-panel dev
```

Turbo 会根据 `@ink-battles/auth-service -> @ink-battles/auth-panel` 的 workspace dependency，先构建面板，再编译并嵌入 Rust 服务。
