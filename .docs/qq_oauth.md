# QQ OAuth 登录集成文档

本文档介绍如何在第三方网站中集成天翔TNXGの空间站提供的QQ OAuth登录服务。

## 概述

我们的QQ OAuth服务为第三方网站提供了便捷的QQ登录功能，无需网站自己申请QQ开放平台应用。整个流程包括：

1. 用户在第三方网站点击QQ登录
2. 重定向到我们的OAuth授权页面
3. 用户完成QQ授权后，带着临时code返回第三方网站
4. 第三方网站使用临时code调用我们的API获取用户信息

## 集成步骤

### 1. 发起OAuth登录

**方式一：直接重定向（推荐）**

```javascript
// 构建授权URL
const authUrl = `https://api-space.tnxg.top/oauth/qq/authorize?redirect=true&return_url=${encodeURIComponent(window.location.origin)}&state=your_custom_state`;

// 重定向到授权页面
window.location.href = authUrl;
```

**方式二：先获取授权URL再重定向**

```javascript
// 1. 获取授权URL
const response = await fetch(`https://api-space.tnxg.top/oauth/qq/authorize?return_url=${encodeURIComponent(window.location.origin)}&state=your_custom_state`);
const data = await response.json();

// 2. 重定向到授权页面
window.location.href = data.data.authUrl;
```

### 2. 处理授权回调

用户完成QQ授权后，系统会重定向回你的网站，并在URL参数中携带临时代码：

```javascript
// 解析URL参数
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');
const error = urlParams.get('error');

if (error) {
    // 处理授权失败
    const errorDescription = urlParams.get('error_description');
    console.error('OAuth failed:', error, errorDescription);
    return;
}

if (code) {
    // 使用临时代码获取用户信息
    getUserInfo(code);
}
```

### 3. 获取用户信息

使用临时代码调用我们的API获取用户信息：

```javascript
async function getUserInfo(tempCode) {
	try {
		const response = await fetch(`https://api-space.tnxg.top/user/info?code=${tempCode}`);
		const data = await response.json();

		if (data.status === "success") {
			const userInfo = data.data;
			console.log("User info:", userInfo);

			// 在这里处理用户信息
			// userInfo 包含以下字段：
			// - user_id: 用户ID
			// - qq_openid: QQ OpenID
			// - nickname: 用户昵称
			// - avatar: 头像URL
			// - gender: 性别
			// - created_at: 创建时间
			// - updated_at: 更新时间

			// 可以将用户信息保存到本地存储或发送到后端
			localStorage.setItem("user", JSON.stringify(userInfo));

			// 登录成功后的处理
			onLoginSuccess(userInfo);
		} else {
			console.error("Get user info failed:", data.message);
		}
	} catch (error) {
		console.error("Request failed:", error);
	}
}
```

## 完整示例

以下是一个完整的集成示例：

```html
<!doctype html>
<html>
	<head>
		<title>QQ登录示例</title>
	</head>
	<body>
		<div id="login-section">
			<button onclick="loginWithQQ()">QQ登录</button>
		</div>

		<div id="user-section" style="display: none">
			<h3>登录成功</h3>
			<div id="user-info"></div>
			<button onclick="logout()">退出登录</button>
		</div>

		<script>
			// 检查是否已经登录
			window.onload = function () {
				const user = localStorage.getItem("user");
				if (user) {
					showUserInfo(JSON.parse(user));
					return;
				}

				// 检查URL参数是否包含授权回调
				const urlParams = new URLSearchParams(window.location.search);
				const code = urlParams.get("code");
				const error = urlParams.get("error");

				if (error) {
					const errorDescription = urlParams.get("error_description");
					alert("登录失败: " + errorDescription);
					// 清理URL参数
					window.history.replaceState({}, document.title, window.location.pathname);
				} else if (code) {
					getUserInfo(code);
				}
			};

			// 发起QQ登录
			function loginWithQQ() {
				const returnUrl = encodeURIComponent(window.location.origin + window.location.pathname);
				const state = "custom_state_" + Date.now(); // 自定义state
				const authUrl = `https://api-space.tnxg.top/oauth/qq/authorize?redirect=true&return_url=${returnUrl}&state=${state}`;
				window.location.href = authUrl;
			}

			// 获取用户信息
			async function getUserInfo(tempCode) {
				try {
					const response = await fetch(`https://api-space.tnxg.top/user/info?code=${tempCode}`);
					const data = await response.json();

					if (data.status === "success") {
						const userInfo = data.data;
						localStorage.setItem("user", JSON.stringify(userInfo));
						showUserInfo(userInfo);

						// 清理URL参数
						window.history.replaceState({}, document.title, window.location.pathname);
					} else {
						alert("获取用户信息失败: " + data.message);
					}
				} catch (error) {
					alert("请求失败: " + error.message);
				}
			}

			// 显示用户信息
			function showUserInfo(userInfo) {
				document.getElementById("login-section").style.display = "none";
				document.getElementById("user-section").style.display = "block";

				const userInfoDiv = document.getElementById("user-info");
				userInfoDiv.innerHTML = `
                <img src="${userInfo.avatar}" alt="头像" width="50" height="50" style="border-radius: 25px;">
                <p>用户ID: ${userInfo.user_id}</p>
                <p>昵称: ${userInfo.nickname}</p>
                <p>性别: ${userInfo.gender === "男" ? "男" : userInfo.gender === "女" ? "女" : "未知"}</p>
                <p>QQ OpenID: ${userInfo.qq_openid}</p>
            `;
			}

			// 退出登录
			function logout() {
				localStorage.removeItem("user");
				document.getElementById("login-section").style.display = "block";
				document.getElementById("user-section").style.display = "none";
			}
		</script>
	</body>
</html>
```

## API 接口说明

### 获取授权URL

**接口**: `GET /oauth/qq/authorize`

**参数**:

- `return_url` (必需): 授权完成后的回调URL
- `state` (可选): 自定义状态值，授权完成后会原样返回
- `redirect` (可选): 设为 `true` 时直接重定向到QQ授权页面，否则返回JSON格式的授权URL

**响应** (当 `redirect` 不为 `true` 时):

```json
{
	"code": "200",
	"message": "QQ OAuth authorization URL generated successfully",
	"status": "success",
	"data": {
		"authUrl": "https://graph.qq.com/oauth2.0/authorize?..."
	}
}
```

### 获取用户信息

**接口**: `GET /api/user/info`

**参数**:

- `code` (必需): 从回调URL中获取的临时代码

**响应**:

```json
{
	"code": "200",
	"message": "User information retrieved successfully",
	"status": "success",
	"data": {
		"user_id": "用户ID",
		"qq_openid": "QQ OpenID",
		"nickname": "用户昵称",
		"avatar": "头像URL",
		"gender": "性别",
		"created_at": "创建时间",
		"updated_at": "更新时间"
	}
}
```

## 错误处理

### 授权回调错误

如果授权失败，回调URL会包含错误参数：

- `error`: 错误类型（如 `oauth_failed`）
- `error_description`: 错误详细描述

### API错误响应

获取用户信息接口可能返回以下错误：

- `400`: 缺少临时代码
- `404`: 无效或过期的临时代码
- `410`: 临时代码已过期
- `500`: 服务器内部错误

## 注意事项

1. **临时代码有效期**: 临时代码有效期为10分钟，请及时使用
2. **一次性使用**: 每个临时代码只能使用一次
3. **HTTPS**: 生产环境建议使用HTTPS协议
4. **状态验证**: 建议使用state参数防止CSRF攻击
5. **用户隐私**: 我们只提供基本的用户信息，不会存储或提供用户的敏感信息

## 技术支持

如有集成问题，请联系技术支持或在GitHub上提交issue。
