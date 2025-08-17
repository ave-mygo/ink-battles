# 认证系统架构文档

## 概述

Ink Battles 采用基于 UID 的用户认证系统，支持邮箱注册/登录和 QQ OAuth 登录，以及两种登录方式的相互绑定。

## 核心设计原则

### 1. UID 作为主要用户标识

- 每个用户拥有唯一的数字 UID（从 1 开始递增）
- UID 作为数据库查询和用户识别的主要标识符
- 邮箱和 QQ OpenID 作为登录凭证，UID 作为内部标识

### 2. 多登录方式支持

- 邮箱 + 密码登录
- QQ OAuth 登录
- 支持两种方式的相互绑定

### 3. JWT Token 结构

```typescript
interface TokenPayload {
	uid: number; // 用户 UID（主要标识）
	email?: string; // 邮箱（如果有）
	qqOpenid?: string; // QQ OpenID（如果有）
	loginMethod: "email" | "qq"; // 当前登录方式
}
```

## 文件结构

```
src/utils/
├── auth-server.ts          # 基础认证功能
├── verification-server.ts  # 邮箱验证码功能
├── qq-login-server.ts      # QQ 登录和绑定功能
├── session-server.ts       # 会话和令牌管理
├── usage-server.ts         # 使用限制验证
├── analytics-server.ts     # 用户数据分析
└── index.ts               # 统一导出
```

## 核心功能

### 1. 用户注册

#### 邮箱注册（需验证码）

```typescript
// src/utils/verification-server.ts
RegisterUser(email: string, password: string, code: string)
```

**流程：**

1. 验证邮箱验证码
2. 检查邮箱是否已注册
3. 生成新的 UID
4. 密码加密存储
5. 创建用户记录

#### QQ 注册（自动创建）

```typescript
// src/utils/qq-login-server.ts
LoginWithQQ(tempCode: string)
```

**流程：**

1. 通过临时授权码获取 QQ 用户信息
2. 检查是否已存在该 QQ 用户
3. 如果是新用户，生成 UID 并创建用户记录
4. 生成 JWT Token 并设置 Cookie

### 2. 用户登录

#### 邮箱登录

```typescript
// src/utils/auth-server.ts
LoginUser(email: string, password: string)
```

**JWT Payload：**

```json
{
	"uid": 123,
	"email": "user@example.com",
	"loginMethod": "email"
}
```

#### QQ 登录

**JWT Payload：**

```json
{
	"uid": 123,
	"qqOpenid": "xxx",
	"email": null,
	"loginMethod": "qq"
}
```

### 3. 账户绑定

#### QQ 绑定到邮箱账户

```typescript
// src/utils/qq-login-server.ts
BindQQToEmail(email: string, tempCode: string)
```

**使用场景：** 用户已有邮箱账户，想要绑定 QQ 快速登录

**验证逻辑：**

- 验证邮箱用户存在
- 验证 QQ 未绑定其他用户（使用 UID 比较）
- 更新用户记录添加 QQ 信息

#### 邮箱绑定到 QQ 账户

```typescript
// src/utils/qq-login-server.ts
BindEmailToQQ(qqOpenid: string, email: string, password: string)
```

**使用场景：** 用户通过 QQ 注册，想要绑定邮箱密码登录

**验证逻辑：**

- 验证 QQ 用户存在
- 验证邮箱未被其他用户使用（使用 UID 比较）
- 验证密码强度
- 更新用户记录添加邮箱和密码

### 4. 用户信息获取

#### 获取当前用户信息

```typescript
// src/utils/auth-server.ts
getCurrentUserInfo(): Promise<UserInfo | null>
```

**查询优先级：**

1. 优先使用 JWT 中的 UID 查询
2. 向后兼容：使用邮箱查询
3. 向后兼容：使用 QQ OpenID 查询

#### 获取当前用户邮箱

```typescript
// src/utils/auth-server.ts
getCurrentUserEmail(): Promise<string | null>
```

## 数据库结构

### 用户表 (users)

```typescript
interface UserInfo {
	uid: number; // 用户唯一标识
	email?: string | null; // 邮箱
	nickname?: string | null; // 昵称
	avatar?: string | null; // 头像
	qqOpenid?: string | null; // QQ OpenID
	loginMethod?: "email" | "qq"; // 注册方式
	passwordHash?: string; // 密码哈希
	createdAt: Date; // 创建时间
	updatedAt?: Date; // 更新时间
	isActive?: boolean; // 是否激活
}
```

### 邮箱验证码表 (email_verification_codes)

```typescript
interface VerificationCode {
	email: string; // 邮箱
	type: "register" | "login"; // 验证类型
	codeHash: string; // 验证码哈希
	createdAt: Date; // 创建时间
	expiresAt: Date; // 过期时间
	used: boolean; // 是否已使用
	usedAt?: Date; // 使用时间
}
```

## UID 生成策略

```typescript
async function generateNextUID(): Promise<number> {
	try {
		// 查询最大的 UID
		const users = await db_read(db_name, "users", {}, {
			sort: { uid: -1 },
			limit: 1
		});

		if (users.length === 0) {
			return 1; // 第一个用户从 1 开始
		}

		return (users[0].uid || 0) + 1;
	} catch (error) {
		console.error("生成UID失败:", error);
		// 如果查询失败，使用时间戳作为备用方案
		return Date.now() % 1000000;
	}
}
```

## 安全考虑

### 1. 密码安全

- 使用 bcrypt 进行密码加密（10 rounds）
- 密码强度验证（至少8位，包含小写字母、数字和特殊字符）

### 2. JWT 安全

- HttpOnly Cookie 存储
- 7天过期时间
- 生产环境启用 Secure 标志

### 3. 验证码安全

- 6位数字验证码
- 10分钟过期时间
- 使用后立即标记为已使用

### 4. 用户绑定安全

- 使用 UID 进行精确的用户身份验证
- 防止一个 QQ 或邮箱被多个用户绑定
- 绑定前验证用户身份和权限

## API 使用示例

### 注册流程

```typescript
// 1. 发送验证码
await SendVerificationEmail("user@example.com", "register");

// 2. 验证码注册
await RegisterUser("user@example.com", "password123!", "123456");
```

### 登录流程

```typescript
// 邮箱登录
await LoginUser("user@example.com", "password123!");

// QQ 登录
await LoginWithQQ("temp_auth_code");
```

### 绑定流程

```typescript
// 已登录邮箱用户绑定 QQ
await BindQQToEmail("user@example.com", "qq_temp_code");

// 已登录 QQ 用户绑定邮箱
await BindEmailToQQ("qq_openid", "user@example.com", "password123!");
```

## 向后兼容性

系统设计考虑了向后兼容性：

1. **JWT 解析**：优先使用 UID，如果不存在则回退到邮箱/QQ OpenID
2. **用户查询**：支持多种查询方式的优先级处理
3. **数据迁移**：现有用户可以通过数据库迁移脚本添加 UID 字段

## 错误处理

所有认证相关函数都返回标准化的响应格式：

```typescript
interface AuthResponse {
	success: boolean;
	message: string;
	userInfo?: UserInfo; // 仅在需要时包含
}
```

常见错误码和处理：

- 用户不存在
- 密码错误
- 验证码错误或过期
- 邮箱已注册
- QQ 已绑定其他用户
- 密码强度不符合要求

## 性能优化

1. **数据库索引**：在 UID、邮箱、QQ OpenID 字段上建立索引
2. **查询优化**：优先使用 UID 进行查询，减少复杂查询
3. **内存管理**：及时清理临时变量，避免内存泄漏
4. **缓存策略**：可考虑对用户信息进行适当缓存

## 监控和日志

建议监控以下指标：

- 注册成功/失败率
- 登录成功/失败率
- 绑定成功/失败率
- UID 生成性能
- JWT 验证性能

关键操作的日志记录：

- 用户注册
- 登录尝试
- 账户绑定
- UID 生成失败
