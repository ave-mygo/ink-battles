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

**前端 (Frontend)**
- **框架**：Next.js 16.0.1 (React 19.2.0)
- **语言**：TypeScript
- **样式**：Tailwind CSS v4 + UnoCSS
- **UI 组件**：Radix UI + shadcn/ui
- **状态管理**：Zustand
- **工具库**：Date-fns, Crypto-js, Sonner (Toast)

**后端 (Backend)**
- **框架**：Elysia (Bun 运行时)
- **语言**：TypeScript
- **中间件**：Elysia 生态中间件集

**数据库与服务**
- **数据库**：MongoDB
- **AI 服务**：OpenAI API (支持自定义模型配置)
- **认证安全**：Jose (JWT), Bcryptjs, FingerprintJS
- **第三方集成**：爱发电 (Afdian) 赞助系统
- **邮件服务**：Nodemailer

## 📦 安装与运行

### 环境要求

- **Node.js** 18+ (前端)，或 **Bun** 1.0+ (后端推荐)
- **pnpm** 10+ (推荐) 或 npm
- **MongoDB** 5.0+

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

3. **配置项目**

复制配置文件模板并重命名：

```bash
cp config.example.toml config.toml
```

编辑 `config.toml` 文件，填入必要的配置信息（详见配置说明）。

4. **启动开发服务器**

```bash
# 同时启动前端（localhost:3000）和后端（localhost:3001）
pnpm dev

# 或单独启动前端/后端
pnpm frontend:dev  # 启动前端，访问 http://localhost:3000
pnpm backend:dev   # 启动后端，API 地址 http://localhost:3001
```

### 构建与部署

```bash
# 构建生产版本（前端 + 后端）
pnpm build

# 单独构建
pnpm frontend:build   # 构建前端
pnpm backend:build    # 构建后端

# 启动生产服务器（仅前端）
pnpm start

# Docker 部署
pnpm build:docker         # 构建前端和后端镜像
pnpm compose:up           # 启动容器
pnpm compose:logs         # 查看日志
```

## ⚙️ 配置说明

主要配置文件位于 `config.toml`，包含以下核心配置项：

- **system_models**: 系统核心模型配置（验证器、搜索服务）
- **grading_models**: 评分模型列表，可配置多个模型供用户选择（如 ChatGPT, Gemini 等），支持设置是否为会员专享 (`premium`)
- **mongodb**: MongoDB 数据库连接配置
- **afdian**: 爱发电 API 配置，用于处理赞助回调和会员权益验证
- **email**: SMTP 邮件服务配置，用于发送通知
- **jwt**: JWT 签名密钥
- **app**: 应用基础配置（名称、URL、公告等）
- **oauth**: OAuth 认证配置（QQ、Google 等第三方登录）
- **external_status**: 外部服务状态监控配置

## 📊 项目结构

Monorepo 架构 (pnpm workspaces)：

```
ink-battles/
├── frontend/              # Next.js 16 前端应用 (App Router)
│   ├── src/
│   │   ├── app/           # 页面路由与布局
│   │   │   ├── analysis/  # 分析页面
│   │   │   ├── dashboard/ # 用户仪表盘
│   │   │   ├── signin/    # 登录页面
│   │   │   ├── oauth/     # OAuth 回调处理
│   │   │   └── api/       # API Routes (服务器端点)
│   │   ├── components/    # React 组件库
│   │   │   ├── ui/        # 基础 UI 组件 (shadcn/ui)
│   │   │   ├── common/    # 通用组件
│   │   │   ├── layouts/   # 布局组件
│   │   │   ├── analysis/  # 分析功能组件
│   │   │   ├── dashboard/ # 仪表盘组件
│   │   │   └── marketing/ # 营销页面组件
│   │   ├── lib/           # 核心工具与配置
│   │   │   ├── db.ts      # 数据库统一接口
│   │   │   └── config.ts  # 全局配置
│   │   ├── utils/         # 业务逻辑工具（按功能域组织）
│   │   │   ├── auth/      # 认证工具 (client/server/common)
│   │   │   ├── api/       # API 调用工具
│   │   │   ├── analysis/  # 分析工具
│   │   │   ├── dashboard/ # 仪表盘工具
│   │   │   ├── billing/   # 计费相关工具
│   │   │   └── common/    # 通用工具函数
│   │   ├── types/         # TypeScript 类型定义
│   │   │   ├── auth/      # 认证相关类型
│   │   │   ├── database/  # 数据库模型类型
│   │   │   ├── ai/        # AI 服务类型
│   │   │   └── common/    # 通用类型
│   │   ├── store/         # Zustand 状态管理
│   │   ├── hooks/         # 自定义 React Hooks
│   │   └── public/        # 静态资源
│   ├── package.json
│   └── tsconfig.json
├── backend/               # Elysia 后端服务
│   ├── src/
│   │   ├── modules/       # 业务模块（核心业务逻辑）
│   │   │   ├── auth.ts
│   │   │   ├── analysis.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── billing.ts
│   │   │   └── ...
│   │   ├── integrations/  # 第三方服务集成
│   │   │   ├── ai.ts      # OpenAI/AI 服务
│   │   │   ├── afdian.ts  # 爱发电集成
│   │   │   ├── mail.ts    # 邮件服务
│   │   │   └── validator.ts # 数据验证
│   │   ├── middleware/    # 中间件
│   │   ├── db/            # 数据库层
│   │   ├── constants/     # 常量定义
│   │   │   └── prompts/   # AI 提示词配置
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── tsconfig.json
├── shared/                # 共享代码
│   ├── constants/         # 共享常量
│   └── package.json
├── scripts/               # 构建与工具脚本
├── config.toml            # 应用配置文件
├── docker-compose.yml     # Docker 编排
├── package.json           # 工作区根配置
└── pnpm-workspace.yaml    # pnpm workspace 配置
```

**架构特点：**
- **frontend/src/** 遵循 CLAUDE.md 规范，按功能域组织工具函数和类型
- **backend/src/** 采用模块化架构，modules 层负责业务逻辑，integrations 层处理外部服务
- **共享层** 通过 shared 包复用常量和通用类型
- **类型安全** 跨 monorepo 共享 TypeScript 类型定义

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

- [爱发电赞助](https://ifdian.net/a/tianxiang?tab=feed)
- GitHub Star
- 提交 Issue 反馈问题

**联系方式**：

- QQ 群：625618470
- GitHub Issues
