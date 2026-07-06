# Ink Battles - 作家战力分析系统

基于 AI 技术的专业文本分析平台，为创作者提供多维度写作评估与深度洞察。系统通过多种 AI 模型与可切换的评分视角，从写作风格、内容质量、语言表达、叙事结构等维度进行全面分析，输出量化评分、雷达图可视化报告和可操作的改进建议。

## 功能特性

### 智能文本分析

- 多模型支持：可配置多种 AI 评分模型（ChatGPT、Gemini、DeepSeek、GLM 等），支持免费/会员分级
- 多维度评估：从语言表达、叙事结构、人物塑造、先锋性、情感共鸣等核心维度综合评分
- 实时流式反馈：分析过程实时输出，提供流畅的用户体验
- 可视化报告：雷达图直观展示各项指标，生成详细的文本分析报告
- Mermaid 图表：结构化展示文本逻辑关系和叙事脉络
- 搜索验证：集成搜索模型（Gemini/DeepSeek）对文本事实性进行交叉验证

### 评分模式

内置 9 种评分视角，满足不同场景需求：

| 模式 | 说明 |
|------|------|
| 初窥门径 | 适合新手作者，设定最高评分限制，提供基础建议 |
| 严苛编辑 | 模拟出版行业标准，进行反向压力测试 |
| 宽容读者 | 侧重鼓励与正向反馈，主动发现作品优点 |
| 文本法官 | 要求评分有理有据，适合学术评价场景 |
| 热血粉丝 | 允许突破评分上限，适合特定风格偏好 |
| 反现代主义者 | 削弱先锋性维度权重，适合传统叙事评价 |
| 速写视角 | 快速评分，仅选取少量核心维度 |
| 碎片主义护法 | 强化先锋性和实验性维度权重 |
| AI 鉴别师 | (开发中) 检测文本的 AI 生成特征 |

支持多模式组合选择，同时从多个视角获取分析结果。

### 用户体系

**分级权限管理：**

| 用户类型 | 单次字数上限 | 日累计限制 | 高级模型 | 历史记录 |
|----------|-------------|-----------|---------|---------|
| 游客 | 60,000 字 | 100,000 字 | 不可用 | 不支持 |
| 注册用户 | 60,000 字 | 无限制 | 不可用 | 支持 |
| 会员用户 | 无限制 | 无限制 | 可用 | 支持 |

**会员等级体系：** 铜牌、银牌、金牌、钻石四级会员，享有不同额度的月度调用赠送和折扣优惠。

### 用户仪表盘

- 个人资料管理与头像设置
- 第三方账号绑定（QQ OAuth）
- 分析历史记录查看与管理
- 分析结果公开分享
- 计费管理与额度查看
- 兑换码/优惠码使用

### 其他功能

- OAuth 登录：支持 QQ、爱发电等第三方登录
- 邮箱注册与密码找回
- 设备指纹识别（FingerprintJS）
- 深色/浅色主题切换
- 响应式设计，移动端适配
- 系统状态监控面板（API 请求统计、模型稳定性、成功率）
- 赞助者列表展示
- SEO 优化（JSON-LD 结构化数据、OpenGraph、Sitemap）
- 文档解析（支持上传 .docx 文件解析为纯文本）

## 技术栈

### 前端

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 16.2.6 (App Router) + React 19.2.5 |
| 语言 | TypeScript 6.0 (strict mode) |
| 样式 | Tailwind CSS v4 + UnoCSS |
| UI 组件 | Radix UI + shadcn/ui |
| 状态管理 | Zustand 5.0 |
| 数据请求 | ElysiaJS Eden (类型安全 API 客户端) + SWR |
| 图表 | Mermaid 11.15 |
| 文档解析 | Mammoth (Word 文档) |
| 通知 | Sonner |
| 主题 | next-themes |
| 图标 | Lucide React + Iconify |
| 构建 | Turbopack |

### 后端

| 分类 | 技术 |
|------|------|
| 框架 | Elysia 1.4 (Bun 运行时) |
| 语言 | TypeScript 6.0 |
| 数据库 | MongoDB 7.2 |
| AI 集成 | OpenAI SDK 6.8 + Google GenAI 1.52 |
| 认证 | Jose (JWT) + Bcryptjs |
| 邮件 | Nodemailer |
| 校验 | TypeBox (JSON Schema) |
| 加密 | Crypto-js |
| 第三方 | 爱发电 (Afdian) API |

### 基础设施

| 分类 | 技术 |
|------|------|
| 包管理 | pnpm 10+ (workspaces monorepo) |
| 容器 | Docker + Docker Compose |
| CI/CD | GitHub Actions (自动构建 GHCR 镜像) |
| 进程管理 | PM2 |
| 代码规范 | ESLint (Antfu config) + Prettier |

## 项目结构

```
ink-battles/
├── apps/frontend/                  # Next.js 前端应用
│   ├── src/
│   │   ├── app/               # App Router 路由与页面
│   │   │   ├── analysis/[id]/ # 分析结果页（动态路由）
│   │   │   ├── dashboard/     # 用户仪表盘
│   │   │   │   ├── profile/   # 个人资料
│   │   │   │   ├── accounts/  # 账号绑定
│   │   │   │   ├── history/   # 历史记录
│   │   │   │   └── billing/   # 计费管理
│   │   │   ├── signin/        # 登录
│   │   │   ├── signup/        # 注册
│   │   │   ├── forgot-password/ # 密码找回
│   │   │   ├── oauth/         # OAuth 回调 (QQ, Afdian)
│   │   │   ├── share/[id]/    # 分享页
│   │   │   ├── sponsors/      # 赞助者
│   │   │   ├── status/        # 系统状态
│   │   │   ├── token/         # Token 管理
│   │   │   ├── friends/       # 友情链接
│   │   │   └── about/         # 关于页面
│   │   ├── components/        # React 组件
│   │   │   ├── ui/            # shadcn/ui 基础组件 (25+)
│   │   │   ├── common/        # 通用组件 (Header, 分析卡片等)
│   │   │   ├── layouts/       # 页面布局组件
│   │   │   │   ├── WriterPage/  # 写作分析核心组件
│   │   │   │   ├── Auth/        # 认证表单
│   │   │   │   ├── Dashboard/   # 仪表盘布局
│   │   │   │   ├── Status/      # 状态页组件
│   │   │   │   ├── Token/       # Token 页组件
│   │   │   │   └── Sponsor/     # 赞助页组件
│   │   │   ├── dashboard/     # 仪表盘业务组件
│   │   │   ├── marketing/     # 营销/着陆页组件
│   │   │   └── seo/           # SEO 组件 (JSON-LD)
│   │   ├── lib/               # 核心库函数
│   │   ├── utils/             # 业务工具函数 (按功能域组织)
│   │   │   ├── api/           # API 客户端与请求工具
│   │   │   ├── auth/          # 认证工具 (client/server/common)
│   │   │   ├── billing/       # 计费计算
│   │   │   ├── analysis/      # 分析结果处理
│   │   │   ├── dashboard/     # 仪表盘数据工具
│   │   │   └── common/        # 通用工具 (文件解析等)
│   │   ├── store/             # Zustand 状态管理
│   │   ├── hooks/             # 自定义 Hooks
│   │   └── types/             # TypeScript 类型定义
│   ├── public/                # 静态资源
│   ├── next.config.ts         # Next.js 配置
│   ├── unocss.config.ts       # UnoCSS 配置
│   └── components.json        # shadcn/ui 配置
│
├── apps/backend/                   # Elysia 后端服务
│   └── src/
│       ├── modules/           # 业务模块
│       │   ├── analysis.ts    # 文本分析接口
│       │   ├── analysis/      # 分析子模块 (队列/缓存/事件/结果)
│       │   ├── auth.ts        # 认证接口
│       │   ├── billing.ts     # 计费接口
│       │   ├── dashboard.ts   # 仪表盘接口
│       │   ├── oauth.ts       # OAuth 接口
│       │   ├── accounts.ts    # 账号管理
│       │   ├── public.ts      # 公开接口
│       │   └── status.ts      # 健康检查
│       ├── integrations/      # 第三方服务集成
│       │   ├── ai.ts          # AI 服务 (OpenAI/Gemini)
│       │   ├── afdian.ts      # 爱发电 API
│       │   ├── mail.ts        # SMTP 邮件
│       │   └── external-status.ts # 外部状态监控
│       ├── middleware/        # 中间件 (auth, csrf, rate-limit, errors)
│       ├── db/                # 数据库层 (MongoDB 连接/索引/仓库)
│       ├── constants/         # 常量与 AI 提示词
│       │   └── prompts/       # System Prompts (Markdown)
│       └── utils/             # 工具函数
│
├── apps/shared/                    # 跨包共享代码
│   ├── types/                 # 共享 TypeScript 类型
│   │   ├── ai/               # AI 分析/评分类型
│   │   ├── auth/             # 认证/会话类型
│   │   ├── common/           # 通用业务类型
│   │   ├── database/         # 数据库模型类型
│   │   └── users/            # 用户类型
│   └── constants/             # 共享常量 (计费规则等)
│
├── scripts/                   # 运维脚本
│   ├── grant-user-calls.js    # 用户额度管理工具
│   └── py/                    # Python 数据分析工具
│
├── config.toml                # 应用配置 (从 config.example.toml 复制)
├── docker-compose.yml         # Docker 编排
├── docker-compose.build.yml   # Docker 构建配置
├── ecosystem.config.cjs       # PM2 配置
├── pnpm-workspace.yaml        # pnpm workspace 定义
└── .github/workflows/         # GitHub Actions CI/CD
```

## 安装与运行

### 环境要求

- **Node.js** 18+ (前端)
- **Bun** 1.0+ (后端运行时)
- **pnpm** 10+
- **MongoDB** 5.0+

### 本地开发

```bash
# 克隆项目
git clone https://github.com/ave-mygo/ink-battles.git
cd ink-battles

# 安装依赖
pnpm install

# 复制配置文件并填入必要信息
cp config.example.toml config.toml

# 同时启动前端 (localhost:3000) 和后端 (localhost:3001)
pnpm dev

# 或单独启动
pnpm frontend:dev   # 前端开发服务器
pnpm backend:dev    # 后端开发服务器
```

### 构建与部署

```bash
# 构建生产版本
pnpm build:all

# 单独构建
pnpm frontend:build
pnpm backend:build

# 启动生产服务器
pnpm frontend:start
pnpm backend:start
```

### Docker 部署

```bash
# 构建镜像
pnpm build:docker

# 启动服务
pnpm compose:up

# 查看日志
pnpm compose:logs

# 停止服务
pnpm compose:down
```

Docker Compose 配置包含前端 (端口 3000) 和后端 (端口 3001) 两个服务，后端挂载 `config.toml` 为只读卷，内存限制 2GB，配有健康检查。

### CI/CD

项目通过 GitHub Actions 自动构建 Docker 镜像并推送至 GitHub Container Registry (GHCR)：

- `ghcr.io/ave-mygo/ink-battles-frontend`
- `ghcr.io/ave-mygo/ink-battles-backend`

触发条件：推送至 main 分支、创建版本标签 (v*)、Pull Request。

## 配置说明

主配置文件 `config.toml`，各配置项说明：

| 配置段 | 说明 |
|--------|------|
| `system_models` | 系统核心模型（验证器、搜索服务），配置 API Key 和 Base URL |
| `grading_models` | 评分模型列表，支持多模型配置，可设置 `premium` 标记为会员专享 |
| `server` | 服务配置（最大请求体、CORS 允许源） |
| `analysis` | 分析参数（最大字数 40 万、最大并发 2、最大队列 20、游客结果 TTL 15 分钟） |
| `mongodb` | MongoDB 连接配置 |
| `afdian` | 爱发电 API 配置（赞助回调、OAuth、会员验证） |
| `email` | SMTP 邮件服务配置 |
| `jwt` | JWT 签名密钥 |
| `registration` | 注册限制（是否要求邀请码） |
| `app` | 应用基础信息（名称、URL、公告内容） |
| `oauth` | 第三方登录配置（QQ 等） |
| `external_status` | 外部服务状态监控 |
| `friends` | 友情链接配置 |

## 架构设计

### 前端架构

- 采用 Next.js App Router，页面组件仅作编排者，业务逻辑下沉至独立组件
- 服务器组件处理数据获取，客户端组件仅负责交互
- 通过 Eden Treaty 实现与后端 Elysia 的端到端类型安全通信
- Zustand 管理认证状态和全局 UI 状态
- 工具函数按功能域组织，client/server 通过文件命名和指令隔离

### 后端架构

- Elysia 框架运行于 Bun，高性能 TypeScript 后端
- 模块化设计：modules 层处理业务逻辑，integrations 层封装第三方服务
- 分析任务队列系统：支持并发控制、优先队列（赞助者优先）、进度追踪
- 中间件栈：认证、CSRF 防护、速率限制、错误处理
- MongoDB 数据层：统一仓库模式，自动索引管理

### 共享层

- `@ink-battles/shared` 包通过 pnpm workspace 链接
- 跨前后端复用 TypeScript 类型定义和业务常量
- 保证前后端数据结构一致性

## 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改，遵循 Conventional Commits 规范：`<type>(<scope>): <description>`
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

**提交类型：** `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore`

**范围：** `auth` | `db` | `ui` | `api` | `deps` | `analysis` | `billing` 等

## 许可证

本项目采用 **Business Source License 1.1 (BSL 1.1)**。

- **变更日期：** 2030-09-14
- **变更后许可证：** GNU Affero General Public License v3.0 (AGPL-3.0)

**使用限制：**
- 允许：个人学习、开发、测试、非生产环境使用
- 禁止：将本项目作为核心功能提供 SaaS 或托管服务（需获商业授权）
- 2030-09-14 后自动转为 AGPL-3.0 开源协议

完整条款参见 [LICENSE](./LICENSE)。

## 支持与联系

- [爱发电赞助](https://ifdian.net/a/tianxiang?tab=feed)
- GitHub Star / Issues
- QQ 群：625618470
