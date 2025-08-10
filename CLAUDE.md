# Ink Battles - Claude AI 助手指南

## 项目概述

Ink Battles 是一个基于 Next.js 的 AI 驱动写作分析和对战场景的 Web 应用。该应用具有用户认证、实时文本分析和基于 shadcn/ui 组件的现代化 UI。

## 开发环境

- **框架**: Next.js 15.4.4 with App Router
- **语言**: TypeScript
- **数据库**: MongoDB
- **认证**: 自定义 JWT 系统
- **UI**: shadcn/ui with Tailwind CSS
- **包管理器**: pnpm
- **AI 集成**: OpenAI API

## 开发命令

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 运行代码检查
pnpm lint
```

## 代码风格规范

详见 `.cursor/rules/codestyle.mdc` 文件中的详细规范。

## 架构指南

### 数据流规范
详见 `.cursor/rules/functionstyle.mdc` 文件中的架构要求：

> 1. 项目应该使用 RSC 的方式从服务器端传递数据
> 2. 部分无法实现的用本地 api 实现（如流式请求）
> 3. 将纯服务器端函数放到 `src/lib/utils-server.ts` 当中
> 4. 数据库使用必须通过 `src/lib/db.ts` 统一调度

### 数据库规范
详见 `.cursor/rules/database.mdc` 文件中的数据库结构规范：

项目使用 MongoDB 数据库，包含以下主要集合：
- **users**: 用户账户信息
- **analysis_requests**: 文本分析请求和结果
- **api_keys**: API 密钥管理
- **email_verification_codes**: 邮箱验证码
- **sessions**: 用户会话
- **daily_usage**: 每日使用统计

所有数据库操作必须通过 `src/lib/db.ts` 统一调度，遵循既定的数据类型规范和索引策略。

### UI 组件标准

详见 `.cursor/rules/uistyle.mdc` 文件中的详细 UI 规范，包括：

> 1. 严格遵循 `shadcn/ui` 组件体系进行构建，所有新功能界面都应优先复用或组合 `shadcn/ui` 提供的基础组件
> 2. 统一使用卡片式布局作为核心内容承载，所有独立的功能区块都必须使用 `Card` 组件包裹
> 3. 建立语义化的色彩应用规范，颜色使用必须有明确的业务含义
> 4. 规范化图标的使用，确保图标与文本配对，应用内的所有图标必须来源于 `lucide-react` 库
> 5. 采用原子化的间距和布局原则，组件内部元素的间距应遵循 `tailwindcss` 的间距尺度
> 6. 优先封装组件内部状态，谨慎处理跨组件状态
> 7. 遵循单一职责原则，及时拆分复杂组件
> 8. 为所有交互行为提供即时、明确的反馈
> 9. 固化信息层级结构，统一卡片内容组织
> 10. 将可访问性（A11y）作为组件开发的基本要求

## 项目文件结构

```
src/
├── app/                    # Next.js App Router 页面和 API 路由
│   ├── api/               # API 端点
│   ├── login/             # 登录页面
│   ├── register/          # 注册页面
│   └── ...                # 其他功能页面
├── components/            # React 组件
│   ├── global/            # 全局组件（头部、导航）
│   ├── layouts/           # 布局组件
│   ├── ui/                # shadcn/ui 组件
│   └── ...                # 功能特定组件
├── lib/                   # 工具库
│   ├── ai.ts              # AI 集成工具
│   ├── db.ts              # 数据库连接和操作
│   ├── utils-server.ts    # 服务器端工具
│   └── ...                # 其他工具模块
└── types/                 # TypeScript 类型定义
```

## Git 提交规范

### 提交消息格式

所有提交必须遵循以下格式：

```
<type>(<scope>): <description>

[可选的详细描述]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: <当前提交用户> <<用户邮箱>>
```

### 类型 (Type)
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更改
- `style`: 代码格式化（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修改bug的代码变动）
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动

### 范围 (Scope)
范围指明本次提交影响的范围，例如：
- `auth`: 认证相关
- `db`: 数据库相关
- `ui`: 用户界面
- `api`: API接口
- `deps`: 依赖项

### 示例
```
feat(auth): 添加用户注册功能

- 新增用户注册API端点
- 添加邮箱验证码发送功能
- 实现密码加密存储

Generated with [Claude Code](https://claude.ai/code) 喵喵喵~

Co-Authored-By: TNXG <tnxg@outlook.jp>
```
## 测试和质量

- **代码检查**: 提交前运行 `pnpm lint`
- **TypeScript**: 启用严格类型检查
- **代码审查**: 遵循既定模式和规范
- **性能**: 优化服务器端渲染和流式传输

## 安全考虑

- **认证**: 基于 JWT 的认证，包含适当的验证
- **输入验证**: 验证所有用户输入
- **数据库安全**: 通过 `db.ts` 使用参数化查询
- **API 安全**: 适当的错误处理和速率限制

## AI 集成

- **OpenAI API**: 用于文本分析和生成
- **流式传输**: 实时响应流式传输以提供更好的用户体验
- **错误处理**: 优雅地处理 API 故障和超时
- **令牌管理**: 适当的验证和使用跟踪

## 部署

- **Docker**: 使用 Dockerfile 进行容器化部署
- **环境**: 使用环境变量进行配置
- **数据库**: MongoDB 具有适当的连接管理
- **静态资源**: 通过 Next.js 构建过程优化

