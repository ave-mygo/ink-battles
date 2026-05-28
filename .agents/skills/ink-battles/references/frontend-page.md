# 前端页面与组件开发参考

## 页面创建规范

### 目录结构

```
frontend/src/app/<route>/
├── page.tsx         # 页面编排者（必须）
├── loading.tsx      # 加载状态（必须）
├── layout.tsx       # 自定义布局（可选）
├── not-found.tsx    # 404 处理（可选）
└── error.tsx        # 错误边界（可选）
```

### page.tsx 最小模板

```typescript
import type { Metadata } from "next";
import { FeatureContent } from "@/components/layouts/Feature/FeatureContent";

export const metadata: Metadata = {
  title: "功能名称 - Ink Battles",
  description: "SEO 描述文本",
};

export default function FeaturePage() {
  return <FeatureContent />;
}
```

### 带 SSR 数据的 page.tsx

```typescript
import type { Metadata } from "next";
import { createServerEden } from "@/utils/api/eden-server";
import { FeatureProvider } from "@/components/layouts/Feature/FeatureProvider";

export const metadata: Metadata = {
  title: "功能名称 - Ink Battles",
};

export const dynamic = "force-dynamic";

export default async function FeaturePage() {
  const eden = createServerEden();
  const { data } = await eden.api.v2["feature"].get();

  return <FeatureProvider initialData={data?.data ?? []} />;
}
```

### 动态路由页面

```typescript
// frontend/src/app/feature/[id]/page.tsx
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `详情 ${id} - Ink Battles` };
}

export default async function FeatureDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <FeatureDetail id={id} />;
}
```

---

## 组件开发规范

### 文件组织

```
frontend/src/components/
├── ui/                    # shadcn/ui 基础组件（通过 CLI 添加）
├── common/                # 通用组件
│   ├── header/            # 头部导航
│   ├── theme/             # 主题切换
│   └── analysis/          # 分析结果展示
├── layouts/               # 页面布局组件
│   ├── WriterPage/        # 首页-写作分析
│   ├── Auth/              # 登录/注册
│   ├── Dashboard/         # 仪表盘
│   ├── Status/            # 状态页
│   ├── Token/             # Token 页
│   └── Sponsor/           # 赞助页
├── dashboard/             # 仪表盘业务组件
├── marketing/             # 营销组件
└── seo/                   # SEO 组件
```

### 客户端组件模板

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClientEden } from "@/utils/api/eden-client";

interface FeatureFormProps {
  onSuccess?: () => void;
}

/**
 * 功能表单组件
 * @param props - 组件属性
 */
export function FeatureForm({ onSuccess }: FeatureFormProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  /** 提交表单数据 */
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("请输入名称");
      return;
    }

    setLoading(true);
    try {
      const eden = createClientEden();
      const { data } = await eden.api.v2["feature"].post({ name });
      if (data?.success) {
        toast.success("创建成功");
        setName("");
        onSuccess?.();
      } else {
        toast.error(data?.error ?? "操作失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-5" />
          创建新项目
        </CardTitle>
        <CardDescription>填写以下信息创建</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="输入名称"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={loading}
        />
        <Button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="cursor-pointer"
        >
          {loading && <Loader2 className="animate-spin" data-icon="inline-start" />}
          {loading ? "提交中..." : "提交"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Provider 模式（SSR 数据传递）

```typescript
"use client";

import { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";

// --- Store 定义 ---
interface FeatureState {
  items: Item[];
  setItems: (items: Item[]) => void;
}

const createFeatureStore = (initialItems: Item[]) =>
  createStore<FeatureState>(set => ({
    items: initialItems,
    setItems: items => set({ items }),
  }));

type FeatureStore = ReturnType<typeof createFeatureStore>;

// --- Context ---
const FeatureStoreContext = createContext<FeatureStore | null>(null);

// --- Provider ---
interface FeatureProviderProps {
  initialData: Item[];
  children: React.ReactNode;
}

export function FeatureProvider({ initialData, children }: FeatureProviderProps) {
  const storeRef = useRef<FeatureStore>(null);
  if (!storeRef.current) {
    storeRef.current = createFeatureStore(initialData);
  }
  return (
    <FeatureStoreContext value={storeRef.current}>
      {children}
    </FeatureStoreContext>
  );
}

// --- Hook ---
export function useFeatureStore<T>(selector: (state: FeatureState) => T): T {
  const store = useContext(FeatureStoreContext);
  if (!store) throw new Error("useFeatureStore must be used within FeatureProvider");
  return useStore(store, selector);
}
```

---

## 样式规范

### Tailwind 类组织顺序

```tsx
<div className="
  {/* 定位 */}     relative z-10
  {/* 布局 */}     flex flex-col items-center gap-4
  {/* 尺寸 */}     w-full max-w-4xl
  {/* 间距 */}     p-6 mt-4
  {/* 背景/边框 */} bg-background border rounded-lg
  {/* 文字 */}     text-sm text-muted-foreground
  {/* 交互 */}     cursor-pointer hover:bg-accent
  {/* 响应式 */}   md:flex-row md:p-8 lg:max-w-6xl
  {/* 深色模式 */} dark:border-border
" />
```

### 语义化颜色 Token

```
bg-background        # 页面背景
bg-card              # 卡片背景
bg-primary           # 主色背景
bg-secondary         # 次要背景
bg-muted             # 柔和背景
bg-accent            # 强调背景
bg-destructive       # 危险/错误

text-foreground      # 主文本
text-muted-foreground # 次要文本
text-primary         # 主色文本
text-destructive     # 错误文本

border-border        # 默认边框
border-input         # 输入框边框
```

### 响应式断点

```tsx
// 移动优先
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 内容 */}
</div>

// 容器
<div className="container mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
  {/* 内容 */}
</div>
```

### Loading 骨架屏模板

```typescript
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* 标题骨架 */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* 卡片骨架 */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Eden Treaty 客户端使用

### 浏览器端客户端

```typescript
import { createClientEden } from "@/utils/api/eden-client";

// 创建客户端实例（自动携带 cookies）
const eden = createClientEden();

// GET 请求
const { data } = await eden.api.v2.feature.get();

// GET 带查询参数
const { data } = await eden.api.v2.feature.list.get({ query: { page: 0, pageSize: 20 } });

// GET 带路径参数
const { data } = await eden.api.v2.feature({ id: "abc123" }).get();

// POST 请求
const { data } = await eden.api.v2.feature.post({ name: "test", content: "hello" });

// PUT 请求
const { data } = await eden.api.v2.feature({ id: "abc123" }).put({ name: "updated" });

// DELETE 请求
const { data } = await eden.api.v2.feature({ id: "abc123" }).delete();
```

### 服务端 Eden 客户端

```typescript
import { createServerEden } from "@/utils/api/eden-server";

// 用于服务器组件中的数据获取
const eden = createServerEden();
const { data } = await eden.api.v2.feature.get();
```

---

## 导入规范示例

```typescript
// 1. 第三方库
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// 2. @/ 绝对路径 - 组件
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// 3. @/ 绝对路径 - 工具/类型/Store
import { createClientEden } from "@/utils/api/eden-client";
import { useAuthStore } from "@/store/auth";
import type { AnalysisResult } from "@ink-battles/shared/types/ai";

// 4. 相对路径 - 同目录组件
import { FeatureCard } from "./FeatureCard";
import { FeatureHeader } from "./FeatureHeader";
```
