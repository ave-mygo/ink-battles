# 分析系统扩展参考

## 分析系统架构

```
用户提交文本 → POST /api/v2/analysis/tasks
    ↓
任务入队（analysis-worker.ts 管理）
    ↓
检查缓存（sha1 + mode + model 匹配）
    ↓ 未命中
AI 模型调用（integrations/ai.ts）
    ↓
结果解析与存储（analysis/result.ts）
    ↓
SSE 流式推送（analysis/events.ts）
    ↓
前端实时展示（WriterAnalysisSystem.tsx）
```

### 核心文件

| 文件 | 职责 |
|------|------|
| `modules/analysis.ts` | API 入口，任务提交 |
| `modules/analysis-worker.ts` | 任务执行器，并发控制 |
| `modules/analysis-progress.ts` | 进度追踪 |
| `modules/analysis/cache.ts` | 结果缓存（sha1 去重） |
| `modules/analysis/events.ts` | SSE 事件流 |
| `modules/analysis/queue.ts` | 任务队列管理 |
| `modules/analysis/records.ts` | 分析记录存储 |
| `modules/analysis/result.ts` | 结果解析与后处理 |
| `modules/analysis/types.ts` | 分析模块内部类型 |
| `integrations/ai.ts` | AI 服务调用封装 |
| `constants/prompts/` | System Prompt 配置 |

---

## 添加新的评分模式

### 步骤 1：编写 System Prompt

在 `backend/src/constants/prompts/system/` 下创建新的 prompt 文件：

```markdown
<!-- backend/src/constants/prompts/system/system-prompt-XX.md -->
# 模式名称

## 角色定位

你是一位[角色描述]，擅长[专长领域]...

## 评分维度

请从以下维度对文本进行评估：

1. **维度名称** (权重 XX%)
   - 评分标准描述
   - 1-20 分评分细则

2. **维度名称** (权重 XX%)
   - 评分标准描述

...

## 评分规则

- 总分计算方式：各维度加权平均
- 分数范围：0-100
- [模式特殊规则，如分数上限/下限]

## 输出格式

请严格按照以下 JSON 格式输出：

```json
{
  "score": 75,
  "dimensions": [
    { "name": "维度名", "score": 80, "weight": 0.3, "comment": "评价" }
  ],
  "summary": "总体评价...",
  "strengths": ["优点1", "优点2"],
  "improvements": ["建议1", "建议2"],
  "detailedAnalysis": "详细分析文本..."
}
```

### 步骤 2：注册模式映射

在 `backend/src/constants/other/prompts.ts` 中添加模式映射：

```typescript
// 模式 ID → System Prompt 文件路径
export const MODE_PROMPTS: Record<string, string> = {
  // ...existing
  "new-mode": "system-prompt-XX.md",
};
```

### 步骤 3：前端模式注册

在 `frontend/src/components/layouts/WriterPage/WriterAnalysisModes.tsx` 中添加：

```typescript
import { NewModeIcon } from "lucide-react";

// 在模式列表数组中添加
{
  id: "new-mode",
  name: "新模式名称",
  description: "一句话描述",
  detailedDescription: "详细描述，显示在 HoverCard 中。说明这个模式的评分特点、适用场景和独特视角。",
  icon: NewModeIcon,
  locked: false,  // true 表示开发中/锁定
}
```

### 步骤 4：验证评分维度类型匹配

确保新模式的输出格式与前端解析逻辑兼容：

```typescript
// shared/types/ai/scoring.ts
export interface ScoringDimension {
  name: string;
  score: number;
  weight: number;
  comment: string;
}

export interface AnalysisOutput {
  score: number;
  dimensions: ScoringDimension[];
  summary: string;
  strengths: string[];
  improvements: string[];
  detailedAnalysis?: string;
  mermaid?: string;  // 可选 Mermaid 图表
}
```

---

## 添加新的 AI 模型

### 步骤 1：config.toml 配置

```toml
[[grading_models]]
name = "新模型显示名"
api_key = "sk-xxx"
base_url = "https://api.provider.com/v1"
model = "model-name-2024"
description = "模型描述，显示在前端模型选择卡片中"
enabled = true
premium = false  # true = 仅会员可用
features = ["feature1", "feature2", "feature3"]
advantages = ["优势1", "优势2"]
usageScenario = "适用场景描述"
warning = ""  # 可选的隐私/使用警告
supports_json_mode = true
```

### 步骤 2：验证模型兼容性

新模型需要支持：
- OpenAI 兼容的 Chat Completions API（`/v1/chat/completions`）
- Streaming 响应（SSE）
- 足够的上下文窗口（建议 32K+）

### 步骤 3：前端展示

模型列表通过 `/api/v2/public/config` 接口动态获取，前端 `WriterModelSelector.tsx` 自动渲染所有启用的模型。无需额外前端代码修改。

---

## 添加搜索验证模型

搜索模型用于对分析文本进行事实性交叉验证。

### config.toml 配置

```toml
[system_models.new_search]
api_key = "sk-xxx"
base_url = "https://api.provider.com/v1"
model = "search-model-name"
```

### 注册为可用搜索模型

```typescript
// backend/src/modules/analysis.ts
const validSearchModels = new Set<SearchModel>([
  "none", "gemini", "gemini-lite", "ds-search",
  "new-search",  // 新增
]);
```

---

## 任务队列系统

### 队列配置

```typescript
// config.toml → analysis 段
analysis.max_concurrent_tasks = 2      // 最大并发执行
analysis.max_queued_tasks = 20         // 标准队列容量
analysis.max_sponsor_queued_tasks = 40 // 赞助者队列容量
analysis.max_active_tasks_per_user = 5 // 每用户最大活跃任务
analysis.guest_result_ttl_minutes = 15 // 游客结果保留时间
```

### 任务池分类

```typescript
type AnalysisTaskPool = "standard" | "sponsor";

// 赞助者（已捐赠用户）进入优先队列
const pool: AnalysisTaskPool = user && await hasDonatedAccount(user.uid)
  ? "sponsor"
  : "standard";
```

### 缓存策略

分析结果以 `sha1(articleText) + mode + modelName + searchModel` 为键缓存，相同输入不重复执行。

```typescript
// backend/src/modules/analysis/cache.ts
const cached = await findCachedAnalysis(sha1, mode, modelName, searchModel);
if (cached?.article?.output?.result && cached.status !== "processing") {
  // 命中缓存，直接创建缓存引用任务
  const taskId = await createCachedTask({ /* ... */ });
}
```

---

## 前端分析结果展示

### 结果组件结构

```
AnalysisResults.tsx
├── ScoreCard.tsx           # 总分展示 (0-100)
├── DimensionsCard.tsx      # 维度雷达图/列表
├── AnalysisCard.tsx        # 总结/优缺点/建议
├── MermaidDiagramsSection.tsx # Mermaid 图表
├── AuthorMatchCard.tsx     # 作者匹配（如有搜索结果）
└── SearchCredentials.tsx   # 搜索验证凭据
```

### 扩展结果展示

如需为新模式添加特殊展示组件：

```typescript
// frontend/src/components/common/analysis/NewModeCard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NewModeCardProps {
  data: NewModeSpecificData;
}

export function NewModeCard({ data }: NewModeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>新模式专属分析</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 特殊展示逻辑 */}
      </CardContent>
    </Card>
  );
}
```

在 `AnalysisResults.tsx` 中条件渲染：

```typescript
{result.mode === "new-mode" && result.specialData && (
  <NewModeCard data={result.specialData} />
)}
```
