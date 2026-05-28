---
name: ink-battles
description: Extend the Ink Battles platform — add new features, pages, API endpoints, analysis modes, and integrations following the project's monorepo architecture, coding conventions, and component patterns.
user-invocable: false
---

# Ink Battles 站点拓展开发技能

为 Ink Battles（作家战力分析系统）添加新功能、页面、API 端点和集成时使用此技能。本技能覆盖前端（Next.js 16 App Router）、后端（Elysia/Bun）和共享类型层的完整开发流程。

## 触发条件

当用户要求以下操作时触发此技能：
- 添加新页面或路由
- 创建新的后端 API 模块
- 添加新的分析评分模式
- 集成新的第三方服务
- 添加新的 UI 组件或业务组件
- 扩展用户仪表盘功能
- 添加新的数据库集合或模型
- 修改计费/会员体系
- 添加新的 OAuth 登录方式

## 项目架构概要

```
ink-battles/
├── frontend/          # Next.js 16 (App Router), React 19, TypeScript
├── backend/           # Elysia 1.4 (Bun 运行时), MongoDB
├── shared/            # @ink-battles/shared 类型和常量
├── config.toml        # 运行时配置
└── pnpm-workspace.yaml
```

**关键技术决策：**
- 前端通过 **Eden Treaty** 与后端通信，实现端到端类型安全
- 后端导出 `App` 类型供前端 Eden 客户端使用
- 共享包 `@ink-battles/shared` 通过 pnpm workspace 链接
- 样式使用 **Tailwind CSS v4 + shadcn/ui**，禁止自定义 CSS
- 状态管理使用 **Zustand**
- 数据库操作统一通过 `backend/src/db/mongo.ts` 封装层

---

## 添加新功能的标准流程

### 流程一：添加新的前端页面

**1. 创建路由文件**

```
frontend/src/app/<route-name>/
├── page.tsx       # 页面编排者（仅获取数据 + 组装组件）
├── loading.tsx    # 加载骨架屏
└── layout.tsx     # 可选：自定义布局
```

**2. page.tsx 规范**

```typescript
// frontend/src/app/new-feature/page.tsx
import type { Metadata } from "next";
import { NewFeatureContent } from "@/components/layouts/NewFeature/NewFeatureContent";

export const metadata: Metadata = {
  title: "新功能 - Ink Battles",
  description: "功能描述",
};

// 如需动态数据
export const dynamic = "force-dynamic";

export default async function NewFeaturePage() {
  // 1. 可选：服务端获取初始数据
  // 2. 组装组件（page.tsx 严禁编写复杂 UI 逻辑）
  return <NewFeatureContent />;
}
```

**3. 组件文件组织**

```
frontend/src/components/layouts/NewFeature/
├── NewFeatureContent.tsx    # 主组件
├── NewFeatureHeader.tsx     # 头部区域
└── NewFeatureCard.tsx       # 功能卡片
```

**4. loading.tsx 模板**

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

---

### 流程二：添加新的后端 API 模块

**1. 创建模块文件**

```typescript
// backend/src/modules/new-feature.ts
import { Elysia, t } from "elysia";
import { COLLECTIONS, findMany, insertOne } from "../db/mongo";
import { requireUser } from "../middleware/auth";
import { ok } from "../utils/response";

export const newFeatureModule = new Elysia()
  .get("/api/v2/new-feature", async ({ request }) => {
    const user = await requireUser(request.headers);
    const data = await findMany(COLLECTIONS.newCollection, { uid: user.uid });
    return ok(data);
  }, {
    detail: { tags: ["New Feature"], summary: "获取新功能数据" },
  })
  .post("/api/v2/new-feature", async ({ request, body }) => {
    const user = await requireUser(request.headers);
    await insertOne(COLLECTIONS.newCollection, {
      uid: user.uid,
      ...body,
      createdAt: new Date(),
    });
    return ok(null, "创建成功");
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      content: t.String({ minLength: 1 }),
    }),
    detail: { tags: ["New Feature"], summary: "创建新功能数据" },
  });
```

**2. 注册模块到 app.ts**

```typescript
// backend/src/app.ts - 添加导入和 .use()
import { newFeatureModule } from "./modules/new-feature";

// 在 createTypedApp() 中链式调用
.use(newFeatureModule)
```

**3. 添加数据库集合常量**

```typescript
// backend/src/db/mongo.ts - COLLECTIONS 对象中添加
export const COLLECTIONS = {
  // ...existing
  newCollection: "new_collection",
} as const;
```

**4. 创建索引（如需要）**

```typescript
// backend/src/db/indexes.ts - ensureBackendIndexes() 中添加
await ensureIndex(COLLECTIONS.newCollection, { uid: 1, createdAt: -1 });
```

---

### 流程三：添加共享类型

**1. 在 shared/types/ 下创建类型文件**

```typescript
// shared/types/common/new-feature.ts
export interface NewFeatureItem {
  _id: string;
  uid: number;
  name: string;
  content: string;
  createdAt: Date;
}

export interface NewFeatureResponse {
  success: boolean;
  data: NewFeatureItem[];
}
```

**2. 从 index.ts 导出**

```typescript
// shared/types/common/index.ts - 添加导出
export * from "./new-feature";
```

**3. 更新 shared/package.json exports（如新增子目录）**

```json
{
  "exports": {
    "./types/common": "./types/common/index.ts"
  }
}
```

---

### 流程四：前端调用新 API

**使用 Eden Treaty 客户端：**

```typescript
"use client";

import { createClientEden } from "@/utils/api/eden-client";

export function useNewFeature() {
  const [data, setData] = useState<NewFeatureItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const eden = createClientEden();
    const { data: response } = await eden.api.v2["new-feature"].get();
    if (response?.success) {
      setData(response.data);
    }
    setLoading(false);
  };

  return { data, loading, fetchData };
}
```

---

### 流程五：添加新的分析评分模式

**1. 定义模式提示词**

```markdown
<!-- backend/src/constants/prompts/system/system-prompt-XX.md -->
# 新模式名称

你是一个[角色描述]...

## 评分维度
- 维度1 (权重 X%)
- 维度2 (权重 Y%)
...

## 输出格式
按照标准 JSON 格式输出...
```

**2. 在前端注册模式**

模式列表定义在 `frontend/src/components/layouts/WriterPage/WriterAnalysisModes.tsx` 中：

```typescript
const ANALYSIS_MODES = [
  // ...existing modes
  {
    id: "new-mode",
    name: "新模式名称",
    description: "模式简要说明",
    detailedDescription: "详细描述，用于 HoverCard 展示",
    icon: SomeIcon, // from lucide-react
  },
];
```

**3. 后端模式映射**

在 `backend/src/modules/analysis-worker.ts` 中确保模式 ID 能映射到对应的 system prompt 文件。

---

### 流程六：添加新的第三方 OAuth 集成

**1. 后端 OAuth 模块**

```typescript
// backend/src/modules/oauth.ts - 添加新的 OAuth 路由
.get("/api/v2/oauth/new-provider/callback", async ({ request, query }) => {
  const { code, state } = query;
  // 1. 用 code 换取 access_token
  // 2. 用 access_token 获取用户信息
  // 3. 绑定或创建用户
  // 4. 签发 JWT
})
```

**2. 前端 OAuth 回调页**

```
frontend/src/app/oauth/new-provider/page.tsx
```

**3. 配置项**

在 `config.toml` 和 `RuntimeConfig` 接口中添加对应的 OAuth 配置段。

---

### 流程七：添加仪表盘子页面

**1. 创建路由**

```
frontend/src/app/dashboard/new-section/
├── page.tsx
└── loading.tsx
```

**2. 注册导航项**

在 `frontend/src/lib/constants.ts` 的 `DASHBOARD_NAV_ITEMS` 中添加：

```typescript
export const DASHBOARD_NAV_ITEMS = [
  // ...existing
  { label: "新版块", href: "/dashboard/new-section", icon: SomeIcon },
];
```

**3. 创建业务组件**

放置在 `frontend/src/components/dashboard/` 目录下。

---

## 关键约束与规范

### 前端规范

| 规则 | 说明 |
|------|------|
| page.tsx 仅编排 | 严禁在 page.tsx 中写复杂 UI 逻辑 |
| 客户端组件标记 | 文件顶部必须 `"use client"` |
| 禁止 React.FC | 使用普通函数组件 |
| 禁止 any | 使用 `unknown` 或具体类型 |
| 禁止 next/router | 使用 `next/navigation` |
| 数据交互 | 通过 Eden Treaty 调用后端，不直接 fetch |
| 样式 | Tailwind 工具类 + shadcn/ui，禁止内联样式 |
| 交互指针 | 所有可点击元素必须 `cursor-pointer` |
| 图标来源 | 统一使用 `lucide-react` |
| 导入路径 | 跨目录用 `@/`，同级/下级用 `./` |
| 深色模式 | 使用语义化 token，禁止手动 `dark:` 颜色覆盖 |

### 后端规范

| 规则 | 说明 |
|------|------|
| API 路径前缀 | 所有接口以 `/api/v2/` 开头 |
| 模块化 | 每个业务域独立模块，导出 Elysia 实例 |
| 链式调用 | Elysia 方法必须链式调用（类型安全要求） |
| 数据验证 | 使用 TypeBox `t.*` 验证输入 |
| 错误响应 | 统一格式 `{ success: false, error: "..." }` |
| 成功响应 | 使用 `ok()` 工具函数包装 |
| 认证 | `requireUser(request.headers)` 或 `getCurrentUser(request.headers)` |
| 数据库操作 | 通过 `db/mongo.ts` 封装层，不直接操作 MongoClient |
| JSDoc | 每个函数必须有 JSDoc 注释 |

### 共享层规范

| 规则 | 说明 |
|------|------|
| 包名 | `@ink-battles/shared` |
| 导入方式 | `from "@ink-battles/shared/types"` 或子路径 |
| 类型分类 | ai/、auth/、common/、database/、users/ |
| 常量分类 | constants/billing.ts 等 |

---

## 组件开发模板

### 标准业务卡片组件

```typescript
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SomeIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  onAction: () => void;
  loading?: boolean;
}

/**
 * 功能卡片组件
 * @param props - 卡片配置属性
 */
export function FeatureCard({ title, description, onAction, loading }: FeatureCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SomeIcon className="size-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onAction}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? "处理中..." : "执行操作"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Zustand Store 模板

```typescript
// frontend/src/store/new-feature.ts
import { create } from "zustand";

interface NewFeatureState {
  items: Item[];
  loading: boolean;
  setItems: (items: Item[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useNewFeatureStore = create<NewFeatureState>(set => ({
  items: [],
  loading: false,
  setItems: items => set({ items }),
  setLoading: loading => set({ loading }),
}));
```

### 工具函数模板

```typescript
// frontend/src/utils/new-feature/index.ts
export { fetchFeatureData, submitFeatureAction } from "./client";
```

```typescript
// frontend/src/utils/new-feature/client.ts
"use client";

import { createClientEden } from "@/utils/api/eden-client";

/**
 * 获取功能数据
 * @returns 功能数据列表
 */
export async function fetchFeatureData() {
  const eden = createClientEden();
  const { data } = await eden.api.v2["new-feature"].get();
  return data;
}

/**
 * 提交功能操作
 * @param payload - 提交数据
 * @returns 操作结果
 */
export async function submitFeatureAction(payload: { name: string; content: string }) {
  const eden = createClientEden();
  const { data } = await eden.api.v2["new-feature"].post(payload);
  return data;
}
```

---

## 配置扩展

当新功能需要运行时配置时：

**1. 更新 config.example.toml**

```toml
[new_feature]
enabled = true
max_items = 100
api_key = "your-api-key-here"
```

**2. 更新 RuntimeConfig 接口**

```typescript
// backend/src/config.ts
export interface RuntimeConfig {
  // ...existing
  new_feature?: {
    enabled: boolean;
    max_items: number;
    api_key: string;
  };
}
```

**3. 添加配置读取函数**

```typescript
// backend/src/config.ts
export function getNewFeatureConfig() {
  const config = getConfig();
  return config.new_feature ?? { enabled: false, max_items: 100, api_key: "" };
}
```

---

## 数据库集合命名规范

| 约定 | 示例 |
|------|------|
| 使用 snake_case | `analysis_tasks`, `user_billing` |
| 业务前缀 | `afd_orders` (爱发电相关) |
| 复数形式 | `users`, `sessions` |
| 在 COLLECTIONS 常量中注册 | `COLLECTIONS.newCollection: "new_collection"` |

---

## Git 提交规范

```
<type>(<scope>): <description>
```

**类型：** feat | fix | docs | style | refactor | perf | test | chore
**范围：** auth | db | ui | api | deps | analysis | billing | dashboard | config

**示例：**
- `feat(api): 添加用户收藏夹 API 端点`
- `feat(ui): 实现收藏夹页面及卡片组件`
- `feat(db): 添加 favorites 集合索引`

---

## 检查清单

添加新功能后，确认以下事项：

- [ ] 类型定义在 `shared/types/` 中（如需跨前后端共享）
- [ ] 后端模块已在 `app.ts` 中 `.use()` 注册
- [ ] 数据库集合已在 `COLLECTIONS` 中注册
- [ ] 必要的索引已在 `indexes.ts` 中定义
- [ ] 前端页面有对应的 `loading.tsx`
- [ ] 客户端组件有 `"use client"` 标记
- [ ] 所有函数有 JSDoc 注释
- [ ] 交互元素有 `cursor-pointer`
- [ ] 深色模式适配（使用语义化 token）
- [ ] 响应式布局（使用 `sm:` / `md:` / `lg:` 断点）
- [ ] TypeScript 类型完整，无 `any`
- [ ] 运行 `pnpm frontend:typecheck && pnpm backend:typecheck` 通过
