# 第三方集成与配置扩展参考

## 现有集成清单

| 集成 | 文件 | 用途 |
|------|------|------|
| AI 服务 | `integrations/ai.ts` | OpenAI/Gemini 模型调用 |
| 爱发电 | `integrations/afdian.ts` | 赞助支付、会员验证 |
| 邮件 | `integrations/mail.ts` | SMTP 邮件发送 |
| 数据验证 | `integrations/validator.ts` | 输入格式校验 |
| 外部状态 | `integrations/external-status.ts` | 第三方服务健康监控 |

---

## 添加新的第三方集成

### 步骤 1：配置定义

```toml
# config.example.toml - 添加配置段
[new_service]
api_key = "your-api-key"
base_url = "https://api.service.com"
enabled = true
# 其他必要配置...
```

### 步骤 2：类型定义

```typescript
// backend/src/config.ts - RuntimeConfig 接口扩展
export interface RuntimeConfig {
  // ...existing
  new_service?: {
    api_key: string;
    base_url: string;
    enabled: boolean;
  };
}
```

### 步骤 3：配置读取函数

```typescript
// backend/src/config.ts - 添加
export function getNewServiceConfig() {
  const config = getConfig();
  return config.new_service ?? { api_key: "", base_url: "", enabled: false };
}
```

### 步骤 4：创建集成模块

```typescript
// backend/src/integrations/new-service.ts

import { getNewServiceConfig } from "../config";

interface NewServiceResponse {
  status: string;
  data: unknown;
}

/**
 * 新服务 API 客户端
 * 封装第三方 API 调用逻辑
 */
class NewServiceClient {
  private config = getNewServiceConfig();

  /** 检查服务是否启用 */
  get enabled() {
    return this.config.enabled && !!this.config.api_key;
  }

  /**
   * 调用服务 API
   * @param endpoint - API 端点路径
   * @param payload - 请求体
   * @returns 服务响应
   */
  async request(endpoint: string, payload: Record<string, unknown>): Promise<NewServiceResponse> {
    if (!this.enabled) {
      throw new Error("NEW_SERVICE_NOT_CONFIGURED");
    }

    const response = await fetch(`${this.config.base_url}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.api_key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`NEW_SERVICE_ERROR: ${response.status}`);
    }

    return response.json() as Promise<NewServiceResponse>;
  }
}

// 导出单例
export const newServiceClient = new NewServiceClient();
```

### 步骤 5：在模块中使用

```typescript
// backend/src/modules/some-module.ts
import { newServiceClient } from "../integrations/new-service";

.post("/api/v2/some-feature", async ({ request, body }) => {
  if (!newServiceClient.enabled) {
    return { success: false, error: "服务暂不可用" };
  }

  const result = await newServiceClient.request("/endpoint", { text: body.text });
  return ok(result);
})
```

---

## OAuth 集成模板

### 通用 OAuth 2.0 流程

```
前端发起 → 重定向到第三方授权页
    ↓
用户授权 → 第三方回调到 /oauth/<provider>?code=xxx
    ↓
后端用 code 换 access_token
    ↓
后端用 access_token 获取用户信息
    ↓
绑定/创建本地用户 → 签发 JWT → 设置 Cookie → 重定向到首页
```

### 后端 OAuth 模块

```typescript
// backend/src/modules/oauth.ts - 添加新 Provider

// --- 新 Provider 配置 ---
interface NewProviderTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface NewProviderUserInfo {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

/**
 * 使用授权码换取 access_token
 * @param code - OAuth 授权码
 * @returns Token 响应
 */
async function exchangeNewProviderToken(code: string): Promise<NewProviderTokenResponse> {
  const config = getConfig();
  const response = await fetch("https://provider.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.oauth.new_provider.client_id,
      client_secret: config.oauth.new_provider.client_secret,
      redirect_uri: config.oauth.new_provider.redirect_uri,
      code,
    }),
  });
  return response.json() as Promise<NewProviderTokenResponse>;
}

/**
 * 使用 access_token 获取用户信息
 * @param accessToken - OAuth access_token
 * @returns 用户信息
 */
async function getNewProviderUserInfo(accessToken: string): Promise<NewProviderUserInfo> {
  const response = await fetch("https://provider.com/api/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json() as Promise<NewProviderUserInfo>;
}

// 在 oauthModule 中添加路由
.get("/api/v2/oauth/new-provider/callback", async ({ request, query }) => {
  const { code } = query;
  if (!code) return { success: false, error: "缺少授权码" };

  // 1. 换取 token
  const tokenData = await exchangeNewProviderToken(code);

  // 2. 获取用户信息
  const providerUser = await getNewProviderUserInfo(tokenData.access_token);

  // 3. 查找或创建用户
  let user = await findOne<AuthUser>(COLLECTIONS.users, { newProviderId: providerUser.id });

  if (!user) {
    // 检查当前是否已登录（绑定场景）
    const currentUser = await getCurrentUser(request.headers);
    if (currentUser) {
      // 绑定到已有账户
      await updateOne(COLLECTIONS.users, { uid: currentUser.uid }, {
        newProviderId: providerUser.id,
        newProviderName: providerUser.name,
      });
      user = await getUserByUid(currentUser.uid);
    } else {
      // 创建新用户
      const uid = await generateNextUID();
      user = {
        uid,
        email: providerUser.email ?? "",
        nickname: providerUser.name,
        avatar: providerUser.avatar ?? gravatarUrl(providerUser.email ?? ""),
        newProviderId: providerUser.id,
        createdAt: new Date(),
      } as AuthUser;
      await createUser(user);
      await initializeUserBilling(uid);
    }
  }

  // 4. 签发 JWT
  const token = await signAuthToken({ uid: user!.uid });
  const cookie = authCookie(token);

  // 5. 重定向到前端
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": cookie,
      "Location": getPublicConfig().app.base_url,
    },
  });
}, {
  query: t.Object({ code: t.String() }),
})
```

### 前端 OAuth 回调页

```typescript
// frontend/src/app/oauth/new-provider/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * OAuth 回调页面
 * 处理第三方登录回调，解析 code 并完成登录
 */
export default function NewProviderOAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/signin?error=oauth_failed");
      return;
    }

    // 回调由后端处理（通过 cookie 设置完成登录）
    // 如果到达此页面说明后端已完成处理，直接跳转
    router.replace("/dashboard");
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>正在完成登录...</span>
      </div>
    </div>
  );
}
```

### 前端账号绑定 UI

在 `frontend/src/components/dashboard/AccountBindings.tsx` 中添加新的绑定卡片：

```typescript
// 绑定按钮
<Button
  variant="outline"
  className="cursor-pointer"
  onClick={() => {
    window.location.href = `https://provider.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
  }}
>
  <ProviderIcon className="size-4" data-icon="inline-start" />
  绑定新平台账号
</Button>
```

---

## 配置扩展 (config.toml)

### 完整配置结构参考

```toml
# === 系统模型 ===
[system_models.validator]
api_key = ""
base_url = ""
model = ""

[system_models.gemini_search]
api_key = ""
base_url = ""
model = ""

# === 评分模型列表 ===
[[grading_models]]
name = "模型名称"
api_key = ""
base_url = ""
model = ""
description = ""
enabled = true
premium = false
features = []
supports_json_mode = true

# === 服务配置 ===
[server]
max_json_body_bytes = 4194304
allowed_origins = ["http://localhost:3001", "https://your-domain.com"]

# === 分析配置 ===
[analysis]
max_article_chars = 400000
max_output_chars = 1048576
max_concurrent_tasks = 2
max_queued_tasks = 20
max_sponsor_queued_tasks = 40
max_active_tasks_per_user = 5
guest_result_ttl_minutes = 15

# === 数据库 ===
[mongodb]
host = "127.0.0.1"
port = 27017
directConnection = true

# === 爱发电 ===
[afdian]
api_token = ""
user_id = ""
client_id = ""
client_secret = ""
redirect_uri = ""

# === 邮件 ===
[email]
host = "smtp.example.com"
port = 465
user = ""
password = ""

# === JWT ===
[jwt]
secret = ""  # 至少 32 字节

# === 注册 ===
[registration]
invite_code_required = false

# === 应用 ===
[app]
app_name = "Ink Battles"
base_url = "https://your-domain.com"

[app.notice]
enabled = false
content = ""
link = ""

# === OAuth ===
[oauth.qq]
client_id = ""
client_secret = ""
redirect_uri = ""

# === 外部状态监控 ===
[external_status]
enabled = false
endpoint = ""

# === 友情链接 ===
[[friends]]
title = ""
description = ""
url = ""
```

### 添加新配置段的完整流程

1. **config.example.toml** - 添加配置模板和注释
2. **backend/src/config.ts** - `RuntimeConfig` 接口添加类型
3. **backend/src/config.ts** - `applyRuntimeDefaults()` 添加默认值
4. **backend/src/config.ts** - 导出配置读取函数
5. **如需前端使用** - 通过 `/api/v2/public/config` 接口暴露（仅公开信息）

---

## 外部服务状态监控

如需监控新集成服务的健康状态：

```typescript
// backend/src/integrations/external-status.ts - 添加
export async function checkNewServiceHealth(): Promise<ServiceStatus> {
  try {
    const start = Date.now();
    const response = await fetch(`${config.base_url}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    return {
      name: "new-service",
      status: response.ok ? "healthy" : "degraded",
      latency,
      lastCheck: new Date(),
    };
  } catch {
    return {
      name: "new-service",
      status: "down",
      latency: -1,
      lastCheck: new Date(),
    };
  }
}
```

在 `modules/status.ts` 中注册健康检查端点。
