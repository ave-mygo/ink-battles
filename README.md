# 作家战力分析系统 (Ink Battles)

基于 AI 技术的专业文本分析工具，为创作者提供深度洞察和智能分析服务。

## 🚀 功能特性

- **智能文本分析**：使用先进的 AI 模型对文本进行多维度分析
- **用户权限管理**：支持游客、普通用户、会员等多种用户类型
- **字数限制系统**：根据用户类型设置不同的使用限制
- **会员等级系统**：基于捐赠金额的多等级会员体系
- **实时数据展示**：流式显示分析结果，提供可视化图表
- **响应式设计**：适配桌面端和移动端设备

## 🛠️ 技术栈

- **框架**：Next.js 15.5.2 (React 19.1.0)
- **语言**：TypeScript
- **样式**：UnoCSS + TailwindCSS
- **数据库**：MongoDB
- **UI 组件**：Radix UI + shadcn/ui
- **状态管理**：Zustand
- **AI 服务**：OpenAI API
- **部署**：Docker + Docker Compose

## 📦 安装与运行

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm
- MongoDB

### 本地开发

1. 克隆项目

```bash
git clone https://github.com/ave-mygo/ink-battles.git
cd ink-battles
```

2. 安装依赖

```bash
pnpm install
```

3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

4. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### Docker 部署

1. 使用 Docker Compose

```bash
docker-compose up -d
```

2. 或者使用提供的 Docker 镜像

```bash
docker run -p 3000:3000 ghcr.io/ave-mygo/ink-battles:latest
```

## ⚙️ 配置说明

### 环境变量

- `MONGO_USER`: MongoDB 用户名
- `MONGO_PASS`: MongoDB 密码
- `OPENAI_API_KEY`: OpenAI API 密钥
- `NEXT_PUBLIC_APP_URL`: 应用访问地址

### 用户权限配置

- **游客**：单次 5,000 字，每日 100,000 字限制
- **普通用户**：单次 60,000 字，无日累计限制
- **会员用户**：无字数限制，高级 AI 模型调用权限

### 会员等级

| 等级 | 消费范围   | 折扣 | 高级调用次数 |
| ---- | ---------- | ---- | ------------ |
| 普通 | 0-50 元    | 0%   | 基础次数     |
| 铜牌 | 50-150 元  | 5%   | 增加次数     |
| 银牌 | 150-300 元 | 10%  | 更多次数     |
| 金牌 | 300-460 元 | 15%  | 大量次数     |
| 钻石 | 460 元以上 | 20%  | 最大次数     |

## 📊 项目结构

```
src/
├── app/                 # Next.js App Router
├── components/          # React 组件
│   ├── common/         # 通用组件
│   ├── layouts/        # 布局组件
│   └── ui/             # UI 基础组件
├── lib/                # 工具库
├── store/              # 状态管理
├── types/              # TypeScript 类型定义
└── config.ts           # 配置文件
```

## 🔧 开发命令

```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint
```

## 📝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 Business Source License 1.1（BSL 1.1）。在变更日期（Change Date）到达后，整个项目将自动转为以 GNU AGPL-3.0 授权。

- 变更日期（Change Date）：2030-09-14
- 变更后许可证（Change License）：AGPL-3.0
- 完整条款请参见仓库根目录的 `LICENSE.md`

### TL;DR（非法律文本，仅作速览）

- 可免费用于：学习、开发、测试、预发布/演示等非生产环境。
- 不可用于：向第三方提供以本项目为核心功能的 SaaS 或托管服务（Managed Service）。
- 如需将本项目作为对外提供服务的核心组件或进行商用，请联系作者/团队获取商业授权。
- 到达变更日期后，项目将转为 AGPL-3.0，需遵守 AGPL 的网络使用条款（对外提供网络服务时需开放对应修改后的源代码）。

### 合规使用指引（示例）

- 内部自用部署（公司/个人内部环境）：允许。
- 二次开发并在内部使用：允许。
- 面向外部用户提供在线服务，且本项目提供核心功能：需要商业授权。
- 变更日之后的使用：按 AGPL-3.0 执行（对网络服务的源代码开放要求需特别注意）。

### 商业授权与咨询

如您的使用场景受限于 BSL 的 SaaS/托管服务限制，请联系以获取商业授权：

- QQ 群：625618470
- 或通过 GitHub Issues 与我们沟通

### SPDX 建议

您可以在源码文件头部附加 SPDX 标识，便于合规扫描工具识别，例如：

```text
SPDX-License-Identifier: BSL-1.1
```

在变更日期之后，若基于 AGPL 使用：

```text
SPDX-License-Identifier: AGPL-3.0
```

完整授权文本与 AGPL 正文已包含于 [`LICENSE.md`](./LICENSE.md)。

## 🤝 支持项目

如果您觉得这个项目对您有帮助，欢迎支持项目的发展：

- [爱发电](https://afdian.com/a/tianxiang?tab=feed)
- GitHub Star
- 提交 Issue 和 PR

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues
- 项目讨论区
