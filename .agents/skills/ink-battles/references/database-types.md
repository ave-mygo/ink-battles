# 数据库与共享类型开发参考

## MongoDB 集合管理

### 现有集合清单

```typescript
// backend/src/db/mongo.ts
export const COLLECTIONS = {
  analysisRequests: "analysis_requests",   // 分析请求记录
  analysisTasks: "analysis_tasks",         // 分析任务（队列）
  userBilling: "user_billing",             // 用户计费信息
  promoCodes: "promo_codes",              // 促销码
  promoCodeRedemptions: "promo_code_redemptions", // 促销码使用记录
  afdOrders: "afd_orders",               // 爱发电订单
  users: "users",                          // 用户表
  afdUsers: "afd_users",                  // 爱发电用户映射
  sessions: "sessions",                    // 临时会话（密码重置等）
  emailCodes: "email_verification_codes",  // 邮箱验证码
  inviteCodes: "invite_codes",            // 邀请码
  rateLimits: "rate_limits",              // 速率限制记录
  authSessions: "auth_sessions",          // 认证会话
  auditLogs: "audit_logs",               // 审计日志
} as const;
```

### 添加新集合

**步骤 1：注册集合名**

```typescript
// backend/src/db/mongo.ts - COLLECTIONS 中添加
export const COLLECTIONS = {
  // ...existing
  favorites: "favorites",
} as const;
```

**步骤 2：定义类型（shared 层）**

```typescript
// shared/types/database/favorites.ts
import type { ObjectId } from "mongodb";

export interface Favorite {
  _id: ObjectId;
  uid: number;
  targetId: string;
  targetType: "analysis" | "article";
  title: string;
  createdAt: Date;
}
```

```typescript
// shared/types/database/index.ts - 添加导出
export * from "./favorites";
```

**步骤 3：添加索引**

```typescript
// backend/src/db/indexes.ts
import { COLLECTIONS } from "./mongo";

export async function ensureBackendIndexes() {
  // ...existing indexes

  // 新集合索引
  await ensureIndex(COLLECTIONS.favorites, { uid: 1, createdAt: -1 });
  await ensureIndex(COLLECTIONS.favorites, { uid: 1, targetId: 1 }, { unique: true });
}
```

**步骤 4：可选 - 创建 Repository 函数**

```typescript
// backend/src/db/repositories.ts - 添加
import type { Favorite } from "@ink-battles/shared/types/database/favorites";

export const getUserFavorites = (uid: number, limit = 50) =>
  findMany<Favorite>(COLLECTIONS.favorites, { uid }, { sort: { createdAt: -1 }, limit });

export const addFavorite = (favorite: Omit<Favorite, "_id">) =>
  insertOne<Favorite>(COLLECTIONS.favorites, favorite as Favorite);

export const removeFavorite = (uid: number, targetId: string) =>
  updateOne(COLLECTIONS.favorites, { uid, targetId }, { $set: { deletedAt: new Date() } });
```

---

## 共享类型系统

### 目录结构

```
shared/types/
├── index.ts            # 聚合导出
├── api.ts              # API 通用响应类型
├── ai/                 # AI 分析相关
│   ├── index.ts
│   ├── analysis.ts     # 分析结果类型
│   ├── analytics.ts    # 统计分析类型
│   └── scoring.ts      # 评分维度类型
├── auth/               # 认证相关
│   ├── index.ts
│   └── session.ts      # 会话类型
├── common/             # 通用业务类型
│   ├── index.ts
│   ├── accounts.ts     # 账号类型
│   ├── billing.ts      # 计费类型
│   ├── config.ts       # 配置类型
│   ├── history.ts      # 历史记录类型
│   ├── password.ts     # 密码相关类型
│   ├── public-config.ts # 公开配置类型
│   └── status.ts       # 状态类型
├── database/           # 数据库模型
│   ├── index.ts
│   ├── afd_order.ts
│   ├── afd_users.ts
│   ├── analysis_requests.ts
│   ├── analysis_tasks.ts
│   ├── promo_code.ts
│   └── user_billing.ts
└── users/              # 用户相关
    ├── index.ts
    ├── store.ts        # 前端 Store 类型
    └── user.ts         # 用户模型
```

### 类型定义规范

```typescript
// shared/types/common/new-feature.ts

/** 功能项目状态 */
export type FeatureStatus = "active" | "archived" | "deleted";

/** 功能项数据模型 */
export interface FeatureItem {
  _id: string;
  uid: number;
  name: string;
  content: string;
  status: FeatureStatus;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/** 创建功能项请求体 */
export interface CreateFeatureRequest {
  name: string;
  content: string;
  tags?: string[];
}

/** 功能项列表响应 */
export interface FeatureListResponse {
  items: FeatureItem[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 导出与导入

```typescript
// shared/types/common/index.ts
export * from "./accounts";
export * from "./billing";
export * from "./config";
export * from "./history";
export * from "./new-feature";  // 新增导出
export * from "./password";
export * from "./public-config";
export * from "./status";
```

### 前后端导入方式

```typescript
// 前端导入
import type { FeatureItem, CreateFeatureRequest } from "@ink-battles/shared/types/common";

// 后端导入
import type { FeatureItem } from "@ink-battles/shared/types/common/new-feature";

// 数据库类型导入
import type { Favorite } from "@ink-battles/shared/types/database/favorites";

// AI 类型导入
import type { AnalysisResult, ScoringDimension } from "@ink-battles/shared/types/ai";
```

### shared/package.json exports 映射

```json
{
  "name": "@ink-battles/shared",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./constants/billing": "./constants/billing.ts",
    "./types": "./types/index.ts",
    "./types/*": "./types/*.ts",
    "./types/ai": "./types/ai/index.ts",
    "./types/auth": "./types/auth/index.ts",
    "./types/common": "./types/common/index.ts",
    "./types/database": "./types/database/index.ts",
    "./types/users": "./types/users/index.ts",
    "./types/*/*": "./types/*/*.ts"
  }
}
```

---

## 共享常量

### 现有常量结构

```typescript
// shared/constants/billing.ts
// 包含计费相关的常量、计算函数和会员等级定义

export const BILLING_CONSTANTS = {
  ADVANCED_MODEL_BASE_COST: 100,    // 高级模型基础费用
  MONTHLY_GRANT_BASE: 50,           // 月度赠送基础额度
  // ...
};

export function calculateMonthlyGrantCalls(tier: string): number { /* ... */ }
export function calculatePaidCallPrice(tier: string): number { /* ... */ }
export function getBillingTierInfo(totalSpent: number): TierInfo { /* ... */ }
```

### 添加新常量模块

```typescript
// shared/constants/new-feature.ts
export const NEW_FEATURE_CONSTANTS = {
  MAX_ITEMS_PER_USER: 100,
  MAX_NAME_LENGTH: 100,
  MAX_CONTENT_LENGTH: 10000,
  DEFAULT_PAGE_SIZE: 20,
} as const;

export type NewFeatureConstantsType = typeof NEW_FEATURE_CONSTANTS;
```

更新 package.json exports：

```json
{
  "exports": {
    "./constants/billing": "./constants/billing.ts",
    "./constants/new-feature": "./constants/new-feature.ts"
  }
}
```

---

## 数据库操作 API

### 核心函数签名

```typescript
// 查询单条
findOne<T>(collection: string, filter: Filter<T>): Promise<T | null>

// 查询多条
findMany<T>(collection: string, filter: Filter<T>, options?: FindOptions<T>): Promise<T[]>

// 插入
insertOne<T>(collection: string, doc: OptionalUnlessRequiredId<T>): Promise<boolean>

// 更新
updateOne<T>(collection: string, filter: Filter<T>, update: Partial<T>): Promise<boolean>

// 原子更新并返回
findOneAndUpdate<T>(
  collection: string,
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
  options?: FindOneAndUpdateOptions
): Promise<T | null>

// 计数
count(collection: string, filter: Filter<Document>): Promise<number>

// 获取原始 Collection
collection<T>(name: string): Promise<Collection<T>>

// 事务
withTransaction(fn: (session: ClientSession) => Promise<void>): Promise<void>

// ObjectId 工具
objectId(id: string): ObjectId
isObjectId(id: string): boolean
```

### 查询模式示例

```typescript
// 带排序和限制
const recentItems = await findMany<Item>(COLLECTIONS.items, 
  { uid, deletedAt: { $exists: false } },
  { sort: { createdAt: -1 }, limit: 10 }
);

// 复合条件
const activeItems = await findMany<Item>(COLLECTIONS.items, {
  uid,
  status: { $in: ["active", "pending"] },
  createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
});

// 使用 MongoDB 原子操作
const updated = await findOneAndUpdate<Counter>(
  COLLECTIONS.counters,
  { name: "feature_count" },
  { $inc: { value: 1 } },
  { upsert: true, returnDocument: "after" }
);
```
