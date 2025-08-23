# 类型提取与重构设计方案

## 概述

本设计方案旨在将 ink-battles 项目中分散在各个组件、API 路由和工具文件中的 TypeScript 类型定义进行统一提取、合并和重构，建立一个集中的类型管理体系，提高代码的可维护性和类型复用性。

**严格遵守原始设计，不要捏造任何新的类型定义，也不要添加任何原结构没有的类型定义。**

## 现状分析

### 当前类型定义分布

经过代码分析，发现项目中的类型定义主要分散在以下位置：

1. **现有 `src/types` 目录**
   - `OrderUsageRecord.ts` - 订单使用记录相关类型
   - `status.ts` - 系统状态和使用日志相关类型

2. **组件中的内联类型定义**
   - `src/components/dashboard/types.ts` - 仪表板使用统计类型
   - 各组件文件中的 interface 定义

3. **工具库中的类型定义**
   - `src/utils/auth-server.ts` - 用户信息类型
   - `src/lib/subscription.ts` - 用户和订阅信息类型
   - `src/lib/token-server.ts` - API Key 记录类型
   - `src/lib/billing.ts` - 计费相关类型
   - `src/lib/analysis-history.ts` - 分析历史相关类型
   - `src/lib/ai.ts` - AI 分析结果类型

4. **API 路由中的内联类型**
   - 各 API 路由文件中的响应和请求类型定义

### 类型重复和冲突问题

发现以下类型定义存在重复或相似功能：

1. **用户信息类型重复**：
   - `auth-server.ts` 中的 `UserInfo`
   - `subscription.ts` 中的 `UserInfo`
   - `utils-server.ts` 中的 `UserInfo`

2. **分析结果类型分散**：
   - `ai.ts` 中的 `AnalysisResult`
   - `analysis-history.ts` 中的 `AnalysisFullResult`

3. **使用统计类型重复**：
   - `dashboard/types.ts` 中的 `UsageStats`
   - `usage-stats/route.ts` 中的 `UsageStats`

## 重构方案

### 新的类型结构设计

```
src/types/
├── index.ts                    # 统一导出
├── auth/
│   ├── index.ts
│   ├── user.ts                 # 用户相关类型（UserInfo 合并）
│   └── session.ts              # 会话和认证类型（AuthState）
├── analysis/
│   ├── index.ts
│   ├── result.ts               # 分析结果类型（AnalysisResult）
│   └── history.ts              # 历史记录类型（AnalysisHistory 相关）
├── billing/
│   ├── index.ts
│   ├── subscription.ts         # 订阅和赞助类型
│   └── usage.ts                # 使用量统计类型（UsageStats）
├── api/
│   ├── index.ts
│   ├── token.ts                # Token 相关类型（ApiKeyRecord）
│   └── status.ts               # 系统状态类型（已存在）
├── common/
│   ├── index.ts
│   └── password.ts             # 密码强度类型（PasswordStrength）
├── services/
│   ├── index.ts
│   └── billing.ts              # 计费服务接口（BillingService）
└── order/
    ├── index.ts
    └── usage.ts                # 订单使用记录（已存在 OrderUsageRecord）
```

### 类型合并策略

#### 1. 用户相关类型统一

**目标文件**: `src/types/auth/user.ts`

合并以下重复的用户类型定义：
- `auth-server.ts` 中的 `UserInfo`
- `subscription.ts` 中的 `UserInfo`  
- `utils-server.ts` 中的 `UserInfo`

从代码分析中发现这些接口的实际定义：

```typescript
// 来自 auth-server.ts 的 UserInfo
export interface UserInfo {
	uid: number;
	email?: string | null;
	nickname?: string | null;
	avatar?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}

// 来自 subscription.ts 的 UserInfo
export interface UserInfo {
	id: string;
	username: string;
	email: string;
	avatar: string;
	afdian_user_id?: string;
	afdian_bound: boolean;
	afdian_username?: string;
	afdian_avatar?: string;
	qqOpenid?: string;
	loginMethod?: "email" | "qq";
	admin?: boolean;
}

// 来自 utils-server.ts 的 UserInfo
export interface UserInfo {
	email?: string | null;
	nickname?: string | null;
	avatar?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}
```

#### 2. 分析相关类型统一

**目标文件**: `src/types/analysis/result.ts`

合并分析结果相关类型，基于现有定义：

```typescript
// 来自 ai.ts 中的内部 Dimension 接口
interface Dimension {
	name: string;
	score: number;
	description: string;
}

// 来自 ai.ts 的 AnalysisResult
export interface AnalysisResult {
	overallScore: number;
	title: string;
	ratingTag: string;
	overallAssessment: string;
	summary: string;
	tags: string[];
	dimensions: Dimension[];
	strengths: string[];
	improvements: string[];
}

// 来自 analysis-history.ts 的相关接口
export interface AnalysisHistoryItem {
	_id: string;
	timestamp: string;
	overallScore: number;
	title: string;
	ratingTag: string;
	summary: string;
	articleText: string;
	mode: string;
	tags?: string[];
}

export interface AnalysisHistoryResponse {
	data: AnalysisHistoryItem[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

export interface AnalysisFullResultDimension {
	name: string;
	score: number;
	description: string;
}

export interface AnalysisFullResult {
	overallScore: number;
	overallAssessment: string;
	title: string;
	ratingTag: string;
	summary: string;
	tags?: string[];
	dimensions: AnalysisFullResultDimension[];
	strengths: string[];
	improvements: string[];
}

export interface AnalysisDetailItem extends AnalysisHistoryItem {
	analysisResult: AnalysisFullResult;
}
```

#### 3. 计费相关类型统一

**目标文件**: `src/types/billing/subscription.ts`

基于现有代码中的定义：

```typescript
// 来自 subscription.ts
export interface SponsorInfo {
	user_id: string;
	name: string;
	avatar?: string;
	all_sum_amount: number;
	bound_order_id?: string;
	binding_method: "oauth" | "order_id";
	create_time?: number;
	last_pay_time?: number;
}

export interface SubscriptionInfo {
	isSubscribed: boolean;
	sponsorInfo: SponsorInfo | null;
	totalAmount: number;
	currentPlan: any;
	subscriptionStatus: string;
}

export interface UserSubscriptionData {
	user: UserInfo;
	subscription: SubscriptionInfo;
}
```

**目标文件**: `src/types/billing/usage.ts`

```typescript
// 来自 dashboard/types.ts 和 usage-stats/route.ts
export interface UsageStats {
	userType: UserType;
	totalAnalysis: number;
	monthlyAnalysis: number;
	todayAnalysis: number;
	totalTextLength: number;
	monthlyTextLength: number;
	todayTextLength: number;
	advancedModelStats?: {
		grantCallsRemaining: number;
		paidCallsRemaining: number;
		todayUsed: number;
	};
	limits: {
		perRequest: number | null;
		dailyLimit: number | null;
	};
}

// 来自 billing.ts
export interface UserBilling {
	userEmail: string;
	totalSpent: number;
	monthlyDonation: number;
	grantCallsRemaining: number;
	paidCallsRemaining: number;
	lastGrantUpdate: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface CallTransaction {
	userEmail: string;
	type: "grant" | "purchase" | "usage";
	amount: number;
	description: string;
	relatedOrderId?: string;
	timestamp: Date;
}

export interface MonthlyGrant {
	userEmail: string;
	year: number;
	month: number;
	donationAmount: number;
	grantedCalls: number;
	createdAt: Date;
}
```

#### 4. 其他类型整理

**目标文件**: `src/types/api/token.ts`

```typescript
// 来自 token-server.ts
export interface ApiKeyRecord {
	_id?: string;
	orderNumber: string;
	orderTime: Date;
	firstIssuedTime: Date;
	lastFingerprintUpdateTime: Date;
	userIp: string;
	token: string;
	browserFingerprint: string;
	isActive: boolean;
}
```

**目标文件**: `src/types/auth/session.ts`

```typescript
// 来自 use-auth.ts
export interface AuthState {
	email: string | null;
	isLoggedIn: boolean;
}
```

**目标文件**: `src/types/common/password.ts`

```typescript
// 来自 password-strength.ts
export interface PasswordStrength {
	score: number; // 0-100
	level: "weak" | "medium" | "strong" | "very-strong";
	requirements: {
		length: boolean;
		lowercase: boolean;
		uppercase: boolean;
		number: boolean;
		special: boolean;
	};
	feedback: string[];
}
```

**目标文件**: `src/types/services/billing.ts`

```typescript
// 来自 billing-service.ts
export interface BillingService {
	getUserBillingInfo: (userEmail: string) => Promise<any>;
	processDonation: (userEmail: string, amount: number, orderId: string) => Promise<void>;
	processCallPurchase: (userEmail: string, calls: number) => Promise<{ success: boolean; cost: number; orderId: string }>;
	calculateCallCost: (userEmail: string, calls: number) => Promise<number>;
	getMembershipInfo: (userEmail: string) => Promise<any>;
}
```

### 重构执行计划

#### 第一阶段：创建新的类型定义结构

1. **创建目录结构**
   ```bash
   mkdir -p src/types/{auth,analysis,billing,api,common,services,order}
   ```

2. **创建基础类型文件**
   - 创建 `src/types/auth/user.ts` - 用户相关类型
   - 创建 `src/types/auth/session.ts` - 认证状态类型
   - 创建 `src/types/analysis/result.ts` - 分析结果类型
   - 创建 `src/types/analysis/history.ts` - 分析历史类型
   - 创建 `src/types/billing/subscription.ts` - 订阅赞助类型
   - 创建 `src/types/billing/usage.ts` - 使用量统计类型
   - 创建 `src/types/api/token.ts` - Token 类型
   - 创建 `src/types/common/password.ts` - 密码强度类型
   - 创建 `src/types/services/billing.ts` - 计费服务接口
   - 迁移 `src/types/OrderUsageRecord.ts` 到 `src/types/order/usage.ts`
   - 保持 `src/types/status.ts` 不变（已正确组织）
   - 创建各模块的 `index.ts` 导出文件

#### 第二阶段：迁移和合并类型定义

1. **用户相关类型迁移**
   - 将 `auth-server.ts`、`subscription.ts`、`utils-server.ts` 中的重复 `UserInfo` 类型迁移到 `src/types/auth/user.ts`
   - 根据不同来源修改类型名称以避免冲突
   - 更新所有引用这些类型的文件

2. **分析相关类型迁移**
   - 将 `ai.ts` 中的 `AnalysisResult` 和 `Dimension` 接口迁移到 `src/types/analysis/result.ts`
   - 将 `analysis-history.ts` 中的所有分析相关接口迁移到相应目录
   - 更新组件和 API 路由中的类型引用

3. **计费相关类型迁移**
   - 将 `billing.ts` 中的计费相关接口迁移到 `src/types/billing/usage.ts`
   - 将 `subscription.ts` 中的订阅相关接口迁移到 `src/types/billing/subscription.ts`
   - 合并 `dashboard/types.ts` 中的 `UsageStats` 类型

4. **其他类型迁移**
   - 将 `token-server.ts` 中的 `ApiKeyRecord` 迁移到 `src/types/api/token.ts`
   - 将 `use-auth.ts` 中的 `AuthState` 迁移到 `src/types/auth/session.ts`
   - 将 `password-strength.ts` 中的 `PasswordStrength` 迁移到 `src/types/common/password.ts`
   - 将 `billing-service.ts` 中的 `BillingService` 迁移到 `src/types/services/billing.ts`
   - 将现有的 `OrderUsageRecord.ts` 迁移到 `src/types/order/usage.ts`

#### 第三阶段：更新导入引用

逐个更新以下文件中的类型导入：

1. **组件文件**
   - `src/components/dashboard/` 下的所有组件
   - `src/components/history/` 下的所有组件
   - `src/components/layouts/` 下的所有组件

2. **API 路由文件**
   - `src/app/api/auth/` 下的所有路由
   - `src/app/api/user/` 下的所有路由
   - `src/app/api/analyze-stream/route.ts`

3. **工具库文件**
   - `src/lib/` 下的所有文件
   - `src/utils/` 下的所有文件

#### 第四阶段：清理和验证

1. **移除重复的类型定义**
   - 删除各文件中已迁移的 interface 定义
   - 保留文件结构，只删除类型定义部分

2. **类型检查验证**
   - 运行 `pnpm typecheck` 确保没有类型错误
   - 修复任何类型不匹配的问题

3. **测试验证**
   - 运行项目确保功能正常
   - 测试各个页面和 API 接口

### 迁移映射表

| 原位置 | 新位置 | 说明 |
|--------|--------|------|
| `auth-server.ts::UserInfo` | `types/auth/user.ts::AuthUserInfo` | 认证用户信息 |
| `subscription.ts::UserInfo` | `types/auth/user.ts::SubscriptionUserInfo` | 订阅系统用户信息 |
| `utils-server.ts::UserInfo` | `types/auth/user.ts::BaseUserInfo` | 基础用户信息 |
| `ai.ts::AnalysisResult` | `types/analysis/result.ts::AnalysisResult` | AI分析结果 |
| `ai.ts::Dimension` | `types/analysis/result.ts::AnalysisDimension` | 分析维度 |
| `analysis-history.ts::AnalysisHistoryItem` | `types/analysis/history.ts::AnalysisHistoryItem` | 分析历史条目 |
| `analysis-history.ts::AnalysisHistoryResponse` | `types/analysis/history.ts::AnalysisHistoryResponse` | 分析历史响应 |
| `analysis-history.ts::AnalysisFullResult` | `types/analysis/result.ts::AnalysisFullResult` | 完整分析结果 |
| `analysis-history.ts::AnalysisFullResultDimension` | `types/analysis/result.ts::AnalysisFullResultDimension` | 完整分析维度 |
| `analysis-history.ts::AnalysisDetailItem` | `types/analysis/history.ts::AnalysisDetailItem` | 分析详情条目 |
| `dashboard/types.ts::UsageStats` | `types/billing/usage.ts::UsageStats` | 使用统计 |
| `subscription.ts::SponsorInfo` | `types/billing/subscription.ts::SponsorInfo` | 赞助者信息 |
| `subscription.ts::SubscriptionInfo` | `types/billing/subscription.ts::SubscriptionInfo` | 订阅信息 |
| `subscription.ts::UserSubscriptionData` | `types/billing/subscription.ts::UserSubscriptionData` | 用户订阅数据 |
| `billing.ts::UserBilling` | `types/billing/usage.ts::UserBilling` | 用户计费信息 |
| `billing.ts::CallTransaction` | `types/billing/usage.ts::CallTransaction` | 调用交易记录 |
| `billing.ts::MonthlyGrant` | `types/billing/usage.ts::MonthlyGrant` | 月度赠送记录 |
| `token-server.ts::ApiKeyRecord` | `types/api/token.ts::ApiKeyRecord` | API Key 记录 |
| `use-auth.ts::AuthState` | `types/auth/session.ts::AuthState` | 认证状态 |
| `password-strength.ts::PasswordStrength` | `types/common/password.ts::PasswordStrength` | 密码强度 |
| `billing-service.ts::BillingService` | `types/services/billing.ts::BillingService` | 计费服务接口 |
| `status.ts::UsageLog` | `types/api/status.ts::UsageLog` | 已存在，保持不变 |
| `status.ts::Stats` | `types/api/status.ts::Stats` | 已存在，保持不变 |
| `status.ts::ApiResponse` | `types/api/status.ts::ApiResponse` | 已存在，保持不变 |
| `OrderUsageRecord.ts::OrderUsageRecord` | `types/order/usage.ts::OrderUsageRecord` | 订单使用记录 |
| `OrderUsageRecord.ts::CreateOrderUsageRecordData` | `types/order/usage.ts::CreateOrderUsageRecordData` | 创建订单使用记录数据 |

### 代码迁移示例

#### 迁移前
```typescript
// src/lib/ai.ts
interface Dimension {
	name: string;
	score: number;
	description: string;
}

export interface AnalysisResult {
	overallScore: number;
	title: string;
	ratingTag: string;
	overallAssessment: string;
	summary: string;
	tags: string[];
	dimensions: Dimension[];
	strengths: string[];
	improvements: string[];
}

// src/components/layouts.tsx
import type { AnalysisResult } from "@/lib/ai";

// src/utils/auth-server.ts
export interface UserInfo {
	uid: number;
	email?: string | null;
	nickname?: string | null;
	avatar?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}
```

#### 迁移后
```typescript
// src/types/analysis/result.ts
export interface AnalysisDimension {
	name: string;
	score: number;
	description: string;
}

export interface AnalysisResult {
	overallScore: number;
	title: string;
	ratingTag: string;
	overallAssessment: string;
	summary: string;
	tags: string[];
	dimensions: AnalysisDimension[];
	strengths: string[];
	improvements: string[];
}

// src/types/auth/user.ts
export interface AuthUserInfo {
	uid: number;
	email?: string | null;
	nickname?: string | null;
	avatar?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}

// src/lib/ai.ts
import type { AnalysisResult, AnalysisDimension } from "@/types/analysis/result";

// src/components/layouts.tsx
import type { AnalysisResult } from "@/types/analysis/result";

// src/utils/auth-server.ts
import type { AuthUserInfo } from "@/types/auth/user";
```

### 类型导入规范
```typescript
// ✅ 推荐：从统一入口导入
import type { UserInfo, AnalysisResult } from '@/types';

// ✅ 推荐：按功能模块导入
import type { UserInfo } from '@/types/auth';
import type { AnalysisResult } from '@/types/analysis';

// ❌ 避免：直接从实现文件导入
import type { UserInfo } from '@/lib/subscription';
```

### 风险评估与缓解

#### 潜在风险

1. **类型不匹配**：合并不同文件中相似但不完全相同的类型可能导致类型错误
2. **依赖关系复杂**：大量文件需要更新导入路径，可能遗漏某些引用
3. **构建失败**：重构过程中可能导致 TypeScript 编译错误

#### 缓解措施

1. **渐进式迁移**：按模块逐步迁移，每次完成一个模块后进行测试
2. **类型兼容性检查**：仔细对比合并前后的类型定义，确保向后兼容
3. **自动化验证**：在每个迁移步骤后运行类型检查和构建测试
4. **备份与回滚**：在重构前创建代码分支，便于出现问题时回滚

### 预期收益

1. **提升可维护性**：集中的类型管理使代码结构更清晰
2. **减少重复代码**：消除重复的类型定义，降低维护成本
3. **增强类型安全**：统一的类型定义减少类型不一致导致的错误
4. **改善开发体验**：更好的类型提示和自动补全
5. **便于扩展**：新功能开发时可以轻松复用现有类型定义

## 测试策略

### 编译时测试
- 运行 `pnpm typecheck` 确保所有类型定义正确
- 使用 `tsc --noEmit` 进行严格的类型检查

### 运行时测试
- 启动开发服务器验证页面正常渲染
- 测试各个 API 接口的请求和响应
- 验证用户认证、分析功能、计费系统等核心功能

### 回归测试
- 对比重构前后的功能表现
- 确保所有现有功能保持正常工作
- 验证类型提示和 IDE 支持正常

通过这个系统性的类型提取与重构方案，可以显著提升 ink-battles 项目的代码质量和可维护性，为后续功能开发和团队协作奠定良好的基础。