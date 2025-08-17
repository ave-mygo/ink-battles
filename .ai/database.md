---
description: 数据库表结构和数据类型规范（自动生成）
globs: "**/src/**/*.{ts,tsx}"
alwaysApply: true
---

## 数据库概览

项目使用 MongoDB 作为数据库，数据库名为 `ink_battles`。

> ⚠️ **注意**: 此文档由脚本自动生成，反映了数据库中的实际数据结构。

## 集合（表）结构

### users - 用户表

**文档数量**: 1

**字段结构：**

| 字段名                | 类型    | 必填 | 描述                           |
| --------------------- | ------- | ---- | ------------------------------ |
| \_id                  | object  | 是   | \_id (object)                  |
| email                 | string  | 是   | 用户邮箱地址                   |
| passwordHash          | string  | 是   | 加密后的密码                   |
| createdAt             | date    | 是   | 创建时间                       |
| updated_at            | date    | 是   | updated_at (date)              |
| avatar                | string  | 是   | avatar (string)                |
| nickname              | string  | 是   | nickname (string)              |
| qqOpenid              | string  | 是   | qqOpenid (string)              |
| updatedAt             | date    | 是   | 更新时间                       |
| isActive              | boolean | 是   | 是否激活                       |
| uid                   | number  | 是   | uid (number)                   |
| afdian_bound_order_id | string  | 是   | afdian_bound_order_id (string) |
| afdian_total_amount   | number  | 是   | afdian_total_amount (number)   |
| afdian_user_id        | string  | 是   | afdian_user_id (string)        |
| afdian_username       | string  | 是   | afdian_username (string)       |
| afdian_avatar         | string  | 是   | afdian_avatar (string)         |

**示例文档：**

```typescript
{
  "email": "tianxiang_tnxg@outlook.com",
  "passwordHash": "$2b$10$AvU1/z.eaIzk89l2WUAcF.Q0/xs7sgNbCEeibhR8aBUGQYviAIOcS",
  "createdAt": "2025-08-10T15:46:15.395Z",
  "updated_at": "2025-08-17T08:16:50.647Z",
  "avatar": "http://thirdqq.qlogo.cn/ek_qqapp/AQWvRdr1KtMrfoT4usHoIAhkDc1nsFhprj7icic5OGZcNg2ZEA0p9UsaO5lVBOc2BUA211Sed24Z2HS91ExgziaYzYs4GFehoSdVwOg4Rntemiabq8CaPT5zFxvhibJ8O0w/100",
  "nickname": "Asahi Shiori",
  "qqOpenid": "3F8E1E43CA217D53B9667665F37424B6",
  "updatedAt": "2025-08-16T10:33:08.018Z",
  "isActive": true,
  "uid": 1,
  "afdian_bound_order_id": "202507062005191025248533300",
  "afdian_total_amount": 605,
  "afdian_user_id": "1d151f2a3d3f11edaba252540025c377",
  "afdian_username": "爱发电用户_q84c",
  "afdian_avatar": "https://pic1.afdiancdn.com/default/avatar/avatar-orange.png"
}
```

### analysis_requests - 分析请求表

**文档数量**: 100

**字段结构：**

| 字段名       | 类型   | 必填 | 描述               |
| ------------ | ------ | ---- | ------------------ |
| \_id         | object | 是   | \_id (object)      |
| articleText  | string | 是   | 文章内容           |
| session      | string | 是   | 会话标识           |
| result       | string | 是   | 分析结果           |
| ip           | string | 是   | IP地址             |
| usage        | null   | 是   | usage (null)       |
| mode         | string | 是   | 分析模式           |
| timestamp    | string | 是   | timestamp (string) |
| overallScore | number | 是   | 综合评分           |
| orderNumber  | null   | 是   | 订单号             |
| sha1         | string | 是   | 内容哈希值         |

**示例文档：**

```typescript
{
  "articleText": "",
  "session": "kbzim7xacoo1w5yth3w1d8",
  "result": "",
  "ip": "120.229.248.227, 47.242.57.32",
  "usage": null,
  "mode": "碎片主义护法",
  "timestamp": "2025-08-17T08:16:30.964Z",
  "overallScore": 75,
  "orderNumber": null,
  "sha1": "e161161cbc54f2e73e0577c32636b74c45bb7119"
}
```

### api_keys - API 密钥表

**文档数量**: 59

**字段结构：**

| 字段名                    | 类型    | 必填 | 描述             |
| ------------------------- | ------- | ---- | ---------------- |
| \_id                      | object  | 是   | \_id (object)    |
| orderNumber               | string  | 是   | 订单号           |
| orderTime                 | date    | 是   | 订单时间         |
| firstIssuedTime           | date    | 是   | 首次签发时间     |
| lastFingerprintUpdateTime | date    | 是   | 最后指纹更新时间 |
| userIp                    | string  | 是   | 用户IP           |
| token                     | string  | 是   | 访问令牌         |
| browserFingerprint        | string  | 是   | 浏览器指纹       |
| isActive                  | boolean | 是   | 是否激活         |

**示例文档：**

```typescript
{
  "orderNumber": "202508171403355552989911758",
  "orderTime": "2025-08-17T06:03:35.000Z",
  "firstIssuedTime": "2025-08-17T06:06:43.425Z",
  "lastFingerprintUpdateTime": "2025-08-17T06:08:21.974Z",
  "userIp": "113.64.132.136",
  "token": "7d889b1fb888927dc9c83a4c43a70bd283c6f68d77452d632b09a35acf917cae",
  "browserFingerprint": "16c606b",
  "isActive": true
}
```

### email_verification_codes - 邮箱验证码表

**文档数量**: 2

**字段结构：**

| 字段名    | 类型    | 必填 | 描述          |
| --------- | ------- | ---- | ------------- |
| \_id      | object  | 是   | \_id (object) |
| email     | string  | 是   | 用户邮箱地址  |
| type      | string  | 是   | 类型标识      |
| codeHash  | string  | 是   | 验证码哈希    |
| createdAt | date    | 是   | 创建时间      |
| expiresAt | date    | 是   | 过期时间      |
| used      | boolean | 是   | 是否已使用    |
| usedAt    | date    | 否   | usedAt (date) |

**示例文档：**

```typescript
{
  "email": "iykrzu@qq.com",
  "type": "register",
  "codeHash": "$2b$10$/2LcOMcJI0kqbE50Nx5m9./hFMgvdZD2nuXqwrhfNd.pDjPXsSR96",
  "createdAt": "2025-08-10T15:28:53.437Z",
  "expiresAt": "2025-08-10T15:38:53.437Z",
  "used": false
}
```

### sessions - 会话表

**文档数量**: 100

**字段结构：**

| 字段名  | 类型   | 必填 | 描述          |
| ------- | ------ | ---- | ------------- |
| \_id    | object | 是   | \_id (object) |
| session | string | 是   | 会话标识      |

**示例文档：**

```typescript
{
  "session": "2pizzh6jsyn6zvpiv1k5w8"
}
```

### daily_usage - 每日使用统计表

**文档数量**: 3

**字段结构：**

| 字段名    | 类型   | 必填 | 描述          |
| --------- | ------ | ---- | ------------- |
| \_id      | object | 是   | \_id (object) |
| dayKey    | string | 是   | 日期键        |
| type      | string | 是   | 类型标识      |
| key       | string | 是   | 标识值        |
| used      | number | 是   | 是否已使用    |
| createdAt | date   | 是   | 创建时间      |
| updatedAt | date   | 否   | 更新时间      |

**示例文档：**

```typescript
{
  "dayKey": "2025-08-16",
  "type": "ip",
  "key": "2400:cb00:80:1000:8f0:106f:925a:f801",
  "used": 2054,
  "createdAt": "2025-08-16T17:24:01.306Z"
}
```

### user_billing - 用户计费信息表

**字段结构：**

| 字段名              | 类型   | 必填 | 描述             |
| ------------------- | ------ | ---- | ---------------- |
| \_id                | object | 是   | 文档主键         |
| userEmail           | string | 是   | 用户邮箱         |
| totalSpent          | number | 是   | 累计消费总额     |
| monthlyDonation     | number | 是   | 当月捐赠金额     |
| grantCallsRemaining | number | 是   | 剩余赠送调用次数 |
| paidCallsRemaining  | number | 是   | 剩余付费调用次数 |
| lastGrantUpdate     | date   | 是   | 最后赠送更新时间 |
| createdAt           | date   | 是   | 创建时间         |
| updatedAt           | date   | 是   | 更新时间         |

### call_transactions - 调用次数交易记录表

**字段结构：**

| 字段名         | 类型   | 必填 | 描述                           |
| -------------- | ------ | ---- | ------------------------------ |
| \_id           | object | 是   | 文档主键                       |
| userEmail      | string | 是   | 用户邮箱                       |
| type           | string | 是   | 交易类型(grant/purchase/usage) |
| amount         | number | 是   | 数量(正数为增加，负数为消耗)   |
| description    | string | 是   | 交易描述                       |
| relatedOrderId | string | 否   | 相关订单ID                     |
| timestamp      | date   | 是   | 交易时间                       |

### monthly_grants - 月度赠送记录表

**字段结构：**

| 字段名         | 类型   | 必填 | 描述         |
| -------------- | ------ | ---- | ------------ |
| \_id           | object | 是   | 文档主键     |
| userEmail      | string | 是   | 用户邮箱     |
| year           | number | 是   | 年份         |
| month          | number | 是   | 月份(1-12)   |
| donationAmount | number | 是   | 捐赠金额     |
| grantedCalls   | number | 是   | 赠送调用次数 |
| createdAt      | date   | 是   | 创建时间     |

### 必需索引

1. **users.email** - 唯一索引

   ```javascript
   { email: 1; }
   ```

2. **analysis_requests.sha1_mode** - 复合索引（用于去重查询）

   ```javascript
   { sha1: 1, mode: 1 }
   ```

3. **analysis_requests.timestamp** - 普通索引（用于时间排序）

   ```javascript
   { timestamp: -1; }
   ```

4. **api_keys.orderNumber** - 唯一索引

   ```javascript
   { orderNumber: 1; }
   ```

5. **api_keys.token** - 唯一索引

   ```javascript
   { token: 1; }
   ```

6. **email_verification_codes.email_type_used** - 复合索引

   ```javascript
   { email: 1, type: 1, used: 1 }
   ```

7. **sessions.session** - 唯一索引

   ```javascript
   { session: 1; }
   ```

8. **daily_usage.dayKey_type_key** - 复合唯一索引

   ```javascript
   { dayKey: 1, type: 1, key: 1 }
   ```

9. **user_billing.userEmail** - 唯一索引

   ```javascript
   { userEmail: 1; }
   ```

10. **call_transactions.userEmail_timestamp** - 复合索引

    ```javascript
    { userEmail: 1, timestamp: -1 }
    ```

11. **monthly_grants.userEmail_year_month** - 复合唯一索引
    ```javascript
    { userEmail: 1, year: 1, month: 1 }
    ```

## 数据访问规范

1. **统一入口**: 所有数据库操作必须通过 `src/lib/db.ts` 中的函数进行
2. **连接管理**: 使用连接池，自动管理连接生命周期
3. **错误处理**: 所有数据库操作都必须包含适当的错误处理
4. **数据验证**: 在写入数据库前进行数据验证
5. **安全性**: 敏感信息（如密码、验证码）必须加密存储
