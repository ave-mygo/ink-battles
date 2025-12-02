# 作家战力分析系统 (Ink Battles)

基于 AI 技术的专业文本分析工具，为创作者提供深度洞察和智能分析服务。通过多维度评估系统，深入分析写作风格、内容质量、语言表达等关键要素，为作家提供可操作的改进建议。

## 🚀 功能特性

### 核心功能
- **智能文本分析**：使用先进的 AI 模型对文本进行多维度分析，提供客观的评分和建议。
- **多模式评估**：内置多种评分视角，满足不同场景需求：
  - **初窥门径**：适合新手，设定最高评分限制。
  - **严苛编辑**：模拟出版行业标准，进行反向压力测试。
  - **宽容读者**：侧重鼓励，主动发现作品优点。
  - **文本法官**：要求评分有理有据，适合学术评价。
  - **热血粉丝**：允许突破评分上限，适合特定风格偏好。
  - **反现代主义者**：削弱先锋性维度权重，适合传统叙事。
  - **速写视角**：快速评分，仅选取少量核心维度。
  - **碎片主义护法**：强化先锋性和实验性维度权重。
  - **AI 鉴别师**：(开发中) 检测文本的 AI 生成特征。
- **实时流式反馈**：分析过程实时展示，提供流畅的用户体验。
- **可视化报告**：生成雷达图和详细的分析报告，直观展示各项指标。

### 用户体系
- **分级权限管理**：
  - **游客用户**：单次 5,000 字，每日 100,000 字限制。
  - **普通用户**：单次 60,000 字，无日累计限制，支持保存历史记录。
  - **会员用户**：无字数限制，拥有高级 AI 模型调用权限。
- **会员赞助系统**：集成爱发电 (Afdian) 支付，支持多等级会员权益（铜牌、银牌、金牌、钻石）。
- **用户仪表盘**：管理个人信息、账号绑定和查看历史记录。

## 🛠️ 技术栈

- **框架**：Next.js 16.0.1 (React 19.2.0)
- **语言**：TypeScript
- **样式**：UnoCSS + TailwindCSS v4
- **数据库**：MongoDB
- **UI 组件**：Radix UI + shadcn/ui
- **状态管理**：Zustand
- **AI 服务**：OpenAI API (支持自定义模型配置)
- **认证安全**：Jose (JWT), Bcryptjs, FingerprintJS
- **工具库**：Date-fns, Crypto-js, Nodemailer

## 📦 安装与运行

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm
- MongoDB

### 本地开发

1. **克隆项目**

```bash
git clone https://github.com/ave-mygo/ink-battles.git
cd ink-battles
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量**

复制配置文件模板并重命名：

```bash
cp src/config.example.ts src/config.ts
```

编辑 `src/config.ts` 文件，填入必要的配置信息（详见配置说明）。

此外，参考 `.env.example` 创建 `.env` 文件（如果项目依赖环境变量）：

```bash
cp .env.example .env
```

4. **启动开发服务器**

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建与部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## ⚙️ 配置说明

主要配置文件位于 `src/config.ts`，包含以下核心配置项：

- **system_models**: 系统核心模型配置（验证器、搜索服务）。
- **grading_models**: 评分模型列表，可配置多个模型供用户选择（如 ChatGPT, Gemini 等），支持设置是否为会员专享 (`premium`)。
- **mongodb**: MongoDB 数据库连接配置。
- **afdian**: 爱发电 API 配置，用于处理赞助回调和会员权益验证。
- **email**: SMTP 邮件服务配置，用于发送通知。
- **jwt**: JWT 签名密钥。
- **app**: 应用基础配置（名称、URL、公告等）。

## 📊 项目结构

```
src/
├── app/                 # Next.js App Router (页面路由)
│   ├── actions/         # Server Actions (服务端操作)
│   ├── api/             # API Routes (后端接口)
│   ├── dashboard/       # 用户仪表盘页面
│   └── ...
├── components/          # React 组件
│   ├── common/          # 通用组件
│   ├── layouts/         # 布局与核心业务组件 (WriterPage)
│   ├── ui/              # 基础 UI 组件 (shadcn/ui)
│   └── ...
├── lib/                 # 工具函数与库
├── store/               # Zustand 状态管理
├── types/               # TypeScript 类型定义
├── utils/               # 业务逻辑工具 (Auth, Billing, Afdian)
└── config.ts            # 全局配置文件
```

## 📝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 **Business Source License 1.1 (BSL 1.1)**。

- **变更日期**：2030-09-14
- **变更后许可证**：GNU Affero General Public License v3.0 (AGPL-3.0)

**简要说明**：
- ✅ **允许**：个人学习、内部测试、非生产环境使用。
- ❌ **禁止**：将本项目作为核心功能提供 SaaS 服务或托管服务（除非获得商业授权）。
- 📅 **2030-09-14 后**：自动转为 AGPL-3.0 开源协议。

完整条款请参见 [LICENSE.md](./LICENSE.md)。

## 🤝 支持与联系

如果您觉得这个项目对您有帮助，欢迎支持：

- [爱发电赞助](https://afdian.com/a/tianxiang?tab=feed)
- GitHub Star
- 提交 Issue 反馈问题

**联系方式**：
- QQ 群：625618470
- GitHub Issues
