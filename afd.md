# 爱发电 API 接口文档（供 Claude Code 使用）

## 开发者信息

- 开发者后台地址：[https://afdian.com/dashboard/dev](https://afdian.com/dashboard/dev)
- 功能汇总：API 与 Webhook、OAuth2、网页嵌入

## 通用类型定义

### 基础响应类型

```typescript
/** 所有接口的基础响应结构 */
interface BaseResponse<T = any> {
	/** 错误代码，200 表示成功 */
	ec: number;
	/** 错误信息，成功时为 "ok" 或空字符串 */
	em: string;
	/** 响应数据 */
	data?: T;
}
```

### 签名参数类型

```typescript
/** API 请求签名参数 */
interface ApiSignParams {
	/** 开发者 user_id */
	user_id: string;
	/** 接口参数的 JSON 字符串 */
	params: string;
	/** 秒级时间戳 */
	ts: number;
	/** 签名值，通过 md5 计算得到 */
	sign: string;
}
```

## Webhook 相关

### Webhook 配置说明

- 需要在开发者后台配置通知地址
- 当有订单时，平台会向配置的 URL 发送请求
- 需返回固定结构表示成功接收

### Webhook 订单通知数据

```typescript
/** Webhook 推送的订单数据 */
interface WebhookOrderData {
	type: "order"; // 目前仅支持 order 类型
	order: OrderDetail;
}

/** Webhook 推送的请求体 */
type WebhookRequest = BaseResponse<WebhookOrderData>;

/** 开发者需要返回的响应 */
interface WebhookResponse {
	ec: 200; // 必须为 200 表示成功接收
	em: string; // 可空字符串
}
```

## API 接口

### 通用说明

- 需要使用 user_id 和 API Token 进行请求
- 支持 form 表单或 json 格式请求
- 签名计算规则：`sign = md5(token + "params" + params + "ts" + ts + "user_id" + user_id)`

### 测试接口（检验签名）

#### 接口信息

- 地址：`https://afdian.com/api/open/ping`
- 方法：POST
- 参数：ApiSignParams 类型

#### 响应类型

```typescript
/** 签名测试接口响应 */
type PingResponse = BaseResponse<{
	uid: string;
	request: ApiSignParams;
}>;
```

### 查询订单接口

#### 接口信息

- 地址：`https://afdian.com/api/open/query-order`
- 方法：POST
- 参数：ApiSignParams 类型，其中 params 为以下类型的 JSON 字符串

#### 请求参数

```typescript
/** 查询订单接口的参数 */
interface QueryOrderParams {
	/** 页码，从 1 开始 */
	page: number;
	/** 每页数量，默认 50，支持 1-100 */
	per_page?: number;
	/** 订单号，多个用英文逗号分隔 */
	out_trade_no?: string;
}
```

#### 响应类型

```typescript
/** 订单详情 */
interface OrderDetail {
	/** 订单号 */
	out_trade_no: string;
	/** 自定义订单 ID */
	custom_order_id: string;
	/** 下单用户 ID */
	user_id: string;
	/** 用户唯一标识，类似微信的 unionid */
	user_private_id: string;
	/** 方案 ID，自选方案为空 */
	plan_id: string;
	/** 赞助月份 */
	month: number;
	/** 真实付款金额，有兑换码则为 0.00 */
	total_amount: string;
	/** 显示金额，折扣前金额 */
	show_amount: string;
	/** 订单状态，2 表示交易成功 */
	status: number;
	/** 订单留言 */
	remark: string;
	/** 兑换码 ID */
	redeem_id: string;
	/** 产品类型，0 常规方案，1 售卖方案 */
	product_type: number;
	/** 折扣金额 */
	discount: string;
	/** 商品详情，售卖类型时存在 */
	sku_detail: Array<{
		/** 商品型号 ID */
		sku_id: string;
		/** 数量 */
		count: number;
		/** 商品名称 */
		name: string;
		/** 专辑 ID */
		album_id: string;
		/** 商品图片 URL */
		pic: string;
	}>;
	/** 收件人 */
	address_person: string;
	/** 收件人电话 */
	address_phone: string;
	/** 收件人地址 */
	address_address: string;
}

/** 查询订单接口响应 */
type QueryOrderResponse = BaseResponse<{
	/** 订单列表 */
	list: OrderDetail[];
	/** 总订单数 */
	total_count: number;
	/** 总页数 */
	total_page: number;
}>;
```

### 查询赞助者接口

#### 接口信息

- 地址：`https://afdian.com/api/open/query-sponsor`
- 方法：POST
- 参数：ApiSignParams 类型，其中 params 为以下类型的 JSON 字符串

#### 请求参数

```typescript
/** 查询赞助者接口的参数 */
interface QuerySponsorParams {
	/** 页码，从 1 开始 */
	page: number;
	/** 每页数量，默认 20，支持 1-100 */
	per_page?: number;
	/** 用户 ID，多个用英文逗号分隔 */
	user_id?: string;
}
```

#### 响应类型

```typescript
/** 赞助方案信息 */
interface SponsorPlan {
	/** 方案 ID */
	plan_id: string;
	/** 排序等级 */
	rank: number;
	/** 用户 ID */
	user_id: string;
	/** 状态 */
	status: number;
	/** 方案名称 */
	name: string;
	/** 方案图片 */
	pic: string;
	/** 方案描述 */
	desc: string;
	/** 价格 */
	price: string;
	/** 更新时间 */
	update_time: number;
	/** 付款月份 */
	pay_month: number;
	/** 显示价格 */
	show_price: string;
	/** 是否独立 */
	independent: number;
	/** 是否永久 */
	permanent: number;
	/** 是否隐藏购买 */
	can_buy_hide: number;
	/** 是否需要地址 */
	need_address: number;
	/** 产品类型 */
	product_type: number;
	/** 销售限制数量 */
	sale_limit_count: number;
	/** 是否需要邀请码 */
	need_invite_code: boolean;
	/** 过期时间 */
	expire_time: number;
	/** 处理后的 SKU */
	sku_processed: any[];
	/** 排名类型 */
	rankType: number;
}

/** 赞助者信息 */
interface SponsorInfo {
	/** 赞助方案列表 */
	sponsor_plans: SponsorPlan[];
	/** 当前赞助方案 */
	current_plan: Partial<SponsorPlan> | { name: "" };
	/** 累计赞助金额（折扣前） */
	all_sum_amount: string;
	/** 首次赞助时间（秒级时间戳） */
	create_time: number;
	/** 最近一次赞助时间（秒级时间戳） */
	last_pay_time: number;
	/** 用户信息 */
	user: {
		/** 用户 ID */
		user_id: string;
		/** 用户昵称 */
		name: string;
		/** 用户头像 URL */
		avatar: string;
	};
}

/** 查询赞助者接口响应 */
type QuerySponsorResponse = BaseResponse<{
	/** 赞助者列表 */
	list: SponsorInfo[];
	/** 总赞助者数 */
	total_count: number;
	/** 总页数 */
	total_page: number;
}>;
```

### 根据订单号查询随机自动回复

#### 接口信息

- 地址：`https://afdian.com/api/open/query-random-reply`
- 方法：POST
- 参数：ApiSignParams 类型，其中 params 为以下类型的 JSON 字符串

#### 请求参数

```typescript
/** 查询随机自动回复的参数 */
interface QueryRandomReplyParams {
	/** 订单号，多个用英文逗号分隔 */
	out_trade_no: string;
}
```

#### 响应类型

```typescript
/** 随机自动回复信息 */
interface RandomReplyInfo {
	/** 订单号 */
	out_trade_no: string;
	/** 回复内容 */
	content: string;
}

/** 查询随机自动回复接口响应 */
type QueryRandomReplyResponse = BaseResponse<{
	/** 随机回复列表 */
	list: RandomReplyInfo[];
}>;
```

### 填入自动随机回复

#### 接口信息

- 地址：`https://afdian.com/api/open/update-plan-reply`
- 方法：POST
- 参数：ApiSignParams 类型，其中 params 为以下类型的 JSON 字符串

#### 请求参数

```typescript
/** 更新自动回复的参数 */
interface UpdatePlanReplyParams {
	/** 方案 ID，与 sku_id 二选一 */
	plan_id?: string;
	/** 型号 ID，与 plan_id 二选一 */
	sku_id?: string;
	/** 自动回复内容，非必填，为空不更新 */
	auto_reply?: string;
	/** 自动随机回复内容，非必填，为空不更新 */
	auto_random_reply?: string;
	/** 更新方式，更新自动随机回复时必填 */
	update_random_reply_type?: "append" | "overwrite";
}
```

#### 响应类型

```typescript
/** 更新自动回复接口响应 */
type UpdatePlanReplyResponse = BaseResponse;
```

## OAuth2 关联授权

### 授权流程

1. 第三方发起授权请求

```typescript
/** 授权请求参数 */
interface OAuthAuthorizeParams {
	response_type: "code"; // 固定值
	scope: "basic"; // 固定值
	client_id: string; // 分配的 client_id
	redirect_uri: string; // 回调地址（urlencoded）
	state: string; // 用于安全校验
}
```

2. 获取 access_token

```typescript
/** 获取 access_token 的参数 */
interface OAuthAccessTokenParams {
	grant_type: "authorization_code"; // 固定值
	client_id: string; // 分配的 client_id
	client_secret: string; // 分配的密钥
	code: string; // 授权流程返回的 code
	redirect_uri: string; // 与授权请求的 redirect_uri 一致
}
```

3. 响应类型

```typescript
/** OAuth 授权响应 */
type OAuthResponse = BaseResponse<{
	/** 用户 ID */
	user_id: string;
	/** 用户唯一标识 */
	user_private_id: string;
	/** 用户昵称 */
	name: string;
	/** 用户头像 URL */
	avatar: string;
}>;
```

## 错误码说明

| 错误码 | 说明                        |
| ------ | --------------------------- |
| 200    | 成功                        |
| 400001 | 参数不完整                  |
| 400002 | 时间过期（ts 超过 3600 秒） |
| 400003 | 参数不是有效的 JSON 字符串  |
| 400004 | 未找到有效的 token          |
| 400005 | 签名验证失败                |

## 注意事项

1. Webhook 可能会重复推送，建议实现幂等逻辑
2. API 请求的 ts 时间戳有效期为 3600 秒
3. 线上环境建议使用 HTTPS 协议保证数据安全
4. client_secret 应仅保存在服务端，如有泄露需及时联系官方重置
5. 分页查询时，通过比较当前页码与 total_page 来判断是否还有数据
