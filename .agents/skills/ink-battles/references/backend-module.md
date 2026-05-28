# 后端 API 模块开发参考

## Elysia 模块结构

本项目后端使用 Elysia 框架，每个业务模块导出一个 Elysia 实例，通过链式 `.use()` 注册到主应用。

### 标准模块模板

```typescript
import { Elysia, t } from "elysia";
import { COLLECTIONS, findMany, findOne, insertOne, updateOne, count } from "../db/mongo";
import { getCurrentUser, requireUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { ok } from "../utils/response";

/**
 * 新功能模块
 * 处理[功能描述]的核心业务逻辑
 */
export const newFeatureModule = new Elysia()
  // GET - 查询数据
  .get("/api/v2/new-feature", async ({ request }) => {
    const user = await requireUser(request.headers);
    const items = await findMany(COLLECTIONS.newFeature, { uid: user.uid });
    return ok(items);
  }, {
    detail: { tags: ["NewFeature"], summary: "获取用户的功能数据" },
  })

  // GET - 带路径参数
  .get("/api/v2/new-feature/:id", async ({ request, params }) => {
    const user = await requireUser(request.headers);
    const item = await findOne(COLLECTIONS.newFeature, { _id: params.id, uid: user.uid });
    if (!item) return { success: false, error: "数据不存在" };
    return ok(item);
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ["NewFeature"], summary: "获取单条数据" },
  })

  // POST - 创建数据
  .post("/api/v2/new-feature", async ({ request, body }) => {
    const user = await requireUser(request.headers);
    const now = new Date();

    await insertOne(COLLECTIONS.newFeature, {
      uid: user.uid,
      ...body,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog({
      action: "new_feature.create",
      uid: user.uid,
      ip: getRequestIp(request),
      ua: getRequestUserAgent(request),
      detail: { name: body.name },
    });

    return ok(null, "创建成功");
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      content: t.String({ minLength: 1, maxLength: 10000 }),
    }),
    detail: { tags: ["NewFeature"], summary: "创建新数据" },
  })

  // PUT - 更新数据
  .put("/api/v2/new-feature/:id", async ({ request, params, body }) => {
    const user = await requireUser(request.headers);
    const existing = await findOne(COLLECTIONS.newFeature, { _id: params.id, uid: user.uid });
    if (!existing) return { success: false, error: "数据不存在" };

    await updateOne(COLLECTIONS.newFeature, { _id: params.id }, {
      ...body,
      updatedAt: new Date(),
    });

    return ok(null, "更新成功");
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      content: t.Optional(t.String({ minLength: 1, maxLength: 10000 })),
    }),
    detail: { tags: ["NewFeature"], summary: "更新数据" },
  })

  // DELETE - 删除数据
  .delete("/api/v2/new-feature/:id", async ({ request, params }) => {
    const user = await requireUser(request.headers);
    const existing = await findOne(COLLECTIONS.newFeature, { _id: params.id, uid: user.uid });
    if (!existing) return { success: false, error: "数据不存在" };

    await updateOne(COLLECTIONS.newFeature, { _id: params.id }, { deletedAt: new Date() });
    return ok(null, "删除成功");
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ["NewFeature"], summary: "软删除数据" },
  });
```

### 认证中间件用法

```typescript
import { getCurrentUser, requireUser } from "../middleware/auth";

// requireUser - 强制要求登录，未登录抛错
const user = await requireUser(request.headers);
// user.uid: number
// user.email: string
// user.nickname: string

// getCurrentUser - 可选登录，返回 user | null
const user = await getCurrentUser(request.headers);
if (!user) {
  // 游客逻辑
}
```

### 数据库操作封装

```typescript
import {
  COLLECTIONS,
  collection,      // 获取原始 MongoDB Collection
  count,           // 计数
  findOne,         // 查询单条
  findMany,        // 查询多条
  insertOne,       // 插入单条
  updateOne,       // 更新单条
  findOneAndUpdate, // 原子更新并返回
  objectId,        // 字符串转 ObjectId
  isObjectId,      // 验证 ObjectId 格式
  withTransaction, // 事务操作
} from "../db/mongo";

// 事务示例
await withTransaction(async (session) => {
  await insertOne(COLLECTIONS.orders, orderData, session);
  await updateOne(COLLECTIONS.users, { uid }, { lastOrderAt: new Date() }, session);
});
```

### 响应工具函数

```typescript
import { ok } from "../utils/response";

// 成功响应
return ok(data);                    // { success: true, data }
return ok(null, "操作成功");        // { success: true, message: "操作成功" }
return ok(data, "获取成功");        // { success: true, data, message: "获取成功" }

// 错误响应（直接返回对象）
return { success: false, error: "错误描述" };
```

### 审计日志

```typescript
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";

await writeAuditLog({
  action: "module.action_name",  // 模块.操作名
  uid: user.uid,
  ip: getRequestIp(request),
  ua: getRequestUserAgent(request),
  detail: { /* 额外信息 */ },
});
```

### 分页查询模式

```typescript
.get("/api/v2/new-feature/list", async ({ request, query }) => {
  const user = await requireUser(request.headers);
  const page = Math.max(0, query.page ?? 0);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));

  const filter = { uid: user.uid, deletedAt: { $exists: false } };
  const total = await count(COLLECTIONS.newFeature, filter);
  const items = await findMany(COLLECTIONS.newFeature, filter, {
    sort: { createdAt: -1 },
    skip: page * pageSize,
    limit: pageSize,
  });

  return ok({ items, total, page, pageSize });
}, {
  query: t.Object({
    page: t.Optional(t.Number({ minimum: 0 })),
    pageSize: t.Optional(t.Number({ minimum: 1, maximum: 50 })),
  }),
})
```

---

## 注册模块到主应用

```typescript
// backend/src/app.ts
import { newFeatureModule } from "./modules/new-feature";

function createTypedApp() {
  return new Elysia()
    // ...existing middleware and modules
    .use(newFeatureModule)  // 添加在 .all("/*") 之前
    .all("/*", ({ request }) => /* proxy logic */);
}
```

**注意：** `.use()` 的顺序影响路由匹配优先级，新模块应添加在 `.all("/*")` 通配路由之前。
