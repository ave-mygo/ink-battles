# Ink Battles Claude Code Prompt

以下内容为 Ink Battles 项目中使用 Claude Code 进行代码生成和修改的规范和最佳实践，涵盖了提交信息规范、代码风格、项目结构等方面，旨在确保代码质量和团队协作效率。

如果与全局规范冲突，请以本文件为准。

## 规范

### Commit 规范

请严格遵循 **Conventional Commits** 规范：

#### 格式

- `<type>(<scope>): <description>`

- **type**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`
- **scope**: 可选，简短描述受影响模块（如 `auth`、`api`、`ui`）。用 camelCase 或 kebab-case。
- **description**: 简洁、祈使句、现在时，不超 50 字符，首字母小写，末尾无句号，用无序列表分列。
- **可选正文/脚注**: 额外上下文或 `BREAKING CHANGE: ...`。
- **中文描述**，使用简体中文生成commit message信息。

#### 原子提交

- 每个 commit **只包含一个功能/修复**。
- 如果涉及多个功能/模块，**必须拆分成多个 commit**，每个都符合上述规范。

#### 示例

```
feat(docker): 配置私有仓库和私有镜像支持
- 修改GitHub工作流文件，使用固定的私有仓库 ave-mygo/ink-battles
- 更新docker-compose.yml使用GitHub Container Registry私有镜像
- 注释掉原有的CNB镜像配置，保留备份
- 确保Docker镜像推送到私有仓库并正确引用
```

### Next.js 16 (App Router), React 19, TypeScript & ShadCN UI 开发规范 (2025)

**角色定位与专业知识：**
作为一名精通 Next.js 16 (App Router)、React 19、TypeScript 和 ShadCN UI 的高级开发者，我将专注于生成清晰、可读、高性能的代码，并严格遵循2025年的最新最佳实践。

#### 1. 项目结构与App Router

- **App Router：** 始终使用 Next.js 16 的 App Router (`app/` 目录)。
- **共置：** 将路由处理程序、加载/错误状态、页面级组件共置在 `app/` 目录中。
- **路由组：** 使用路由组 `()` 组织路由，不影响URL。
- **复杂布局：** 使用并行路由或拦截路由实现复杂布局和模态框。
- **API路由：** API 路由处理程序放在 `app/api`。
- **组件组织：** `components/` 目录，按功能或领域分类。
- **共享逻辑：** `lib/` 或 `utils/`。
- **静态资源：** `public/`。
- **全局布局：** `app/layout.tsx`。
- **命名约定：** 组件文件 `PascalCase.tsx`，目录 `kebab-case` 或 `snake_case`。

#### 2. 代码风格与TypeScript

- **TypeScript：** 始终使用 TypeScript，强制严格模式，明确定义类型，避免 `any`。
- **组件类型：** 优先使用 React 19 函数式组件、Hooks 和 Next.js 16 服务器组件 (SSR/SSG)。
- **命名约定：**
  - 组件：`PascalCase`
  - 变量、函数、Hooks：`camelCase`
  - 描述性名称：特别关注 `useActionState` 和 `useOptimistic` 等新 Hooks。
- **工具：** 强制使用 ESLint 和 Prettier。
- **Props 定义：** 通过接口定义 props，在函数签名中类型化，明确包含 `children`（如果需要），避免使用 `React.FC`。
- **Ref 处理：** 将 `ref` 作为 prop 在函数组件中访问，避免 `forwardRef`。

#### 3. 命名规范

- **变量命名**: 使用小驼峰命名法 (camelCase)
- **函数命名**: 使用大驼峰命名法 (PascalCase)
- **命名原则**: 使用具有描述性的名称，避免无意义的名称

#### 4. 代码格式

- **函数风格**: 优先使用箭头函数
- **括号风格**: 采用 K&R 风格 (左括号不换行)
- **缩进风格**: 使用 2 个空格进行缩进，保持一致性

#### 5. 注释规范

- **函数注释**: 每个函数都必须有明确的注释，说明功能、参数和返回值
- **逻辑注释**: 复杂逻辑部分需要添加适当的注释，解释代码意图和实现方式
- **分组注释**: 不同功能的代码应该分组，并使用适当的注释分隔

#### 6. 代码组织

- **结构清晰**: 代码文件的组织结构应该清晰，便于维护
- **封装原则**: 避免使用全局变量，尽量将数据和操作封装在函数或类中
- **简洁性**: 循环和条件语句保持逻辑简洁，避免嵌套过深
- **纯服务器端函数：** 将纯服务器端函数放到 `src/lib/utils-server.ts` 当中。
- **数据库使用：** 数据库使用必须通过 `src/lib/db.ts` 统一调度。

#### 7. 导入规范

- **路径格式**:
  - 如果文件在**当前目录**下，只能使用 `./文件名` 或 `./子目录/文件名` 的相对导入。
  - 如果文件在**同一层级或下级目录**，统一使用 `./` 开头的相对路径，不允许出现 `../`。
  - 如果文件在**层数不高的上级目录**，统一使用 `../` 开头的相对路径。
  - 如果需要跨目录导入（如公共模块、全局工具），统一使用 `@/路径/路径` 绝对路径导入。
  - 禁止出现 `../../../` 这类超过两层以上的相对路径。
- **导入格式**: 使用命名导入 `import { 组件 } from "组件库"`，禁止默认导入 `import 组件 from "组件库"`

#### 8. 服务器组件 (Server Components)

- **默认：** 默认用于数据获取和渲染。
- **数据传递：** 项目应该使用 RSC 的方式从服务器端传递数据。
- **限制：** 不使用客户端 Hooks 或浏览器 API。
- **流式传输/加载：** 使用 Suspense 边界实现流式传输和细粒度加载状态。
- **SEO：** 在 `layout.tsx` 或 `page.tsx` 中使用 `generateMetadata` 进行动态 SEO 元数据。
- **缓存：** 优先使用 `fetch` 及其 `revalidate` 选项进行缓存。
- **静态构建：** 实现 `generateStaticParams` 用于动态路由的静态构建。
- **完全动态：** 使用 `unstable_noStore` 进行完全动态、非缓存渲染。
- **数据获取优化：** 使用 `Promise.all` 进行并行数据获取，`React.cache` 进行请求去重。
- **禁止：** 不导入客户端专属模块。

#### 9. 客户端组件 (Client Components)

- **标记：** 文件顶部明确标记 `"use client"`。
- **导航：** 使用 `next/navigation` 的 `useRouter` 和 `usePathname` (而非 `next/router`)。
- **表单状态：** 结合 Server Actions，使用 `useFormStatus`、`useFormState`、`useOptimistic` 处理表单状态。
- **逻辑：** 包含用户交互和浏览器 API 等客户端专属逻辑。
- **限制：** 仅用于真正交互式、有状态的部分，避免过度使用。

#### 10. 数据获取与服务器 Actions

- **服务器组件数据获取：** 使用内置 `fetch` 进行数据检索。
- **缓存策略：** `fetch(url, { next: { revalidate: <seconds> } })`。
- **Serverless 环境：** 最小化外部请求。
- **禁止客户端获取：** 避免在客户端组件中获取数据，如果服务器可以完成。
- **流式请求：** 部分无法实现的用本地 API 实现（如流式请求）。
- **服务器 Actions 定义：** 使用 `use server` 指令定义。
- **服务器 Actions 调用：** 可从服务器和客户端组件调用，用于数据变更。
- **客户端 Hooks：** 在客户端组件中使用 `useFormStatus` 和 `useFormState` 跟踪表单提交。
- **乐观更新：** 使用 `useOptimistic` 在服务器确认前乐观更新 UI。
- **禁止表单提交方式：** 表单提交不用 `router.push`。

#### 11. 路由处理程序 (Route Handlers)

- **替代：** 替代 `pages/api` 路由，放在 `app/api` 下。
- **GET 默认：** `GET` 处理程序默认是静态的，除非另行配置。
- **安全：** 验证传入数据，使用适当的 CORS 或安全措施。
- **响应：** 支持 JSON、文本和其他文件响应。

#### 12. 中间件与Edge Runtime

- **中间件：** 使用 `middleware.ts` 进行路由拦截、认证、重定向和重写。
- **Edge Runtime：** 用于更快的启动和基于位置的个性化。
- **处理：** 在中间件中处理 cookies、headers 和动态重写。
- **注意：** 留意 Edge Runtime 的约束。

#### 13. 样式与资产

- **主要样式方案：** 优先且主要使用 **Tailwind CSS 工具类** 进行一致性样式设计。
- **自定义 CSS：** 仅在特殊、复杂或 Tailwind 无法直接实现的场景下，才使用自定义 CSS（例如 CSS Modules）。
- **类组织：** 逻辑地组织 Tailwind 类（例如：布局、间距、颜色、排版）。
- **响应式与状态变体：** 在标记中广泛使用响应式 (`sm:`, `md:`, `lg:`) 和状态变体 (`hover:`, `focus:`, `dark:`)。
- **统一设计语言：** **强烈依赖 Tailwind 类**，而非内联样式或独立的外部 CSS 文件，以维护统一的设计语言。
- **图片优化：** 使用内置 `<Image />` 组件。
- **字体优化：** 考虑 `@next/font` 或更新的 API。
- **ShadCN UI：** 组件放在 `@/components/ui/`，其样式完全依赖 Tailwind CSS，确保正确配置并清除未使用的 CSS。使用 `npx shadcn@latest add <component>`。

#### 14. UI/UX 与 ShadCN UI 风格推荐

- **ShadCN UI 体系：** 严格遵循 `shadcn/ui` 组件体系进行构建，所有新功能界面都应优先复用或组合 `shadcn/ui` 提供的基础组件（如 `Card`, `Button`, `Switch`, `Progress` 等），避免从零开始造轮子，以确保整个应用在视觉风格、交互行为和代码结构上保持高度一致性和可维护性。
- **卡片式布局：** 统一使用卡片式布局作为核心内容承载，所有独立的功能区块，如输入区、结果展示区、模式选择区，都必须使用 `Card` 组件包裹，并统一应用 `className="border-0 bg-white/80 shadow-lg backdrop-blur-sm"` 样式，形成具有辨识度的“毛玻璃”视觉风格，增强界面的整体感和层次感。
- **语义化色彩：** 建立语义化的色彩应用规范，颜色使用必须有明确的业务含义，蓝色 (`-blue-`) 应用于主要的交互、选中状态和功能性图标，绿色 (`-green-`) 和红色 (`-red-`) 专门用于表示成功/有效和失败/无效的状态提示，品牌色（如粉色 `-pink-`、紫色 `-purple-`）用于特定的号召性操作（Call to Action），如赞助和社群链接。
- **图标规范：** 规范化图标的使用，确保图标与文本配对，应用内的所有图标必须来源于 `lucide-react` 库，图标不应单独作为功能入口，而是作为文本标签的视觉辅助，放置在文本左侧，并使用 `flex` 和 `items-center` 确保对齐，例如，`<Gauge className="..."/> 评分模式`。
- **间距与布局：** 采用原子化的间距和布局原则，组件内部元素的间距应遵循 `tailwindcss` 的间距尺度（如 `space-y-4`, `gap-2`），形成有韵律的垂直和水平间距，对于多列布局，应使用 `grid` 系统（如 `md:grid-cols-3`），以实现清晰且具备响应式能力的布局结构。
- **组件内部状态：** 优先封装组件内部状态，谨慎处理跨组件状态，组件应优先管理自身的状态（如 `WriterAnalysisModes` 中的 `isModesExpanded`），对于必须在父子组件间传递的状态和方法（如 `articleText` 和 `setArticleText`），props 命名应清晰明了，当状态传递超过两层时，应考虑使用 React Context 进行状态管理，以避免过深的属性钻取（Prop Drilling）。
- **单一职责原则与拆分：** 遵循单一职责原则，及时拆分复杂组件，当一个组件的逻辑变得复杂时（如 `WriterAnalysisInput` 中包含了 Token 校验、字数限制、弹窗逻辑），应将其中的独立功能模块拆分为子组件，例如，`DonateModal` 应被提取为独立文件，并通过 props (`open`, `onClose`) 进行控制，以增强代码的可读性和复用性。
- **即时反馈：** 为所有交互行为提供即时、明确的反馈，用户的任何操作都应获得视觉响应，这包括：按钮的 `disabled` 禁用状态，输入框的 `focus` 状态边框高亮，使用 `HoverCard` 为复杂选项提供非侵入式的解释说明，以及在执行异步操作时（如校验 Token）提供明确的加载中提示。
- **信息层级结构：** 固化信息层级结构，统一卡片内容组织，在 `Card` 组件内部，必须严格遵循 `CardHeader` > `CardTitle` + `CardDescription`，以及 `CardContent` 的内容组织范式，这确保了用户在浏览不同功能卡片时，能以相同的心理模型快速定位标题、说明和主体内容。
- **可访问性 (A11y)：** 将可访问性（A11y）作为组件开发的基本要求，确保所有交互元素（`Button`, `Link`, `Switch`, `input`）都能通过键盘完全访问和操作，对于 `HoverCard` 等组件，要确保其触发和内容对屏幕阅读器友好，在设计点击区域时，要保证其尺寸足够大，便于移动端用户和特殊需求用户操作。
- **文本内容：** 除去内容外，组件硬编码的文本应该尽量避免使用 emoji 表情。
- **文档元数据：** 使用 React 原生支持管理 `title`、`link`、`meta` 标签，改善 SEO。
- **样式表管理：** 控制加载顺序，确保关键样式优先加载，自动去重。
- **脚本加载：** 使用 `script async` 后台加载脚本，自动去重，优先于关键资源。

#### 16. 性能优化

- **渲染：** 使用流式传输和 Suspense 加快初始渲染。
- **依赖：** 在客户端组件中动态导入大型依赖。
- **重渲染：** 在客户端组件中使用 `React.useMemo` 和 `React.useCallback` 避免不必要的重渲染。
- **缓存：** 谨慎使用 `fetch` 缓存和重新验证。
- **客户端包：** 避免阻塞主线程，利用代码分割或服务器组件。

#### 16. SEO

- **内置管理：** 使用 `metadata` 或 `Head` (Next.js 16) 进行 SEO 管理。
- **元数据：** 在布局或页面配置中提供 `title`、`description`。
- **高级 SEO：** 利用 Next.js SSG/SSR 元数据更新。

#### 17. 部署与开发设置

- **平台：** Vercel 或自托管 (Node/Docker)。
- **测试：** 彻底测试 SSR 和静态输出。
- **环境变量：** 保持安全，绝不在客户端暴露私有值。
- **静态资产：** `public/`。
- **工具：** TypeScript、ESLint、Prettier。
- **Monorepo：** 考虑 Pnpm workspaces 或 Turborepo。

#### 18. 测试与Linting

- **Linting：** 使用 `next lint` (ESLint) 并集成 Prettier。
- **测试框架：** Jest、React Testing Library 或 Cypress。
- **文件位置：** 测试文件靠近相关组件。

#### 19. 最佳实践 (Dos & Don'ts)

- **Do：** 在 `app` 目录组织路由和组件。
- **Do：** 利用服务器组件进行数据获取。
- **Do：** 使用服务器 Actions 进行表单提交。
- **Do：** 使用 `next/link` 进行内部路由和预取。
- **Do：** 使用 `loading` 文件实现加载状态。
- **Do：** 仔细分离服务器和客户端逻辑。
- **Do：** 广泛使用 Tailwind 工具类。
- **Do：** 最小化依赖，保持更新。
- **Do：** 使用 TypeScript 严格模式和高级特性。
- **Don't：** 混合 `pages` 和 `app` 目录进行路由。
- **Don't：** 在客户端组件中获取数据，如果服务器可以完成。
- **Don't：** 在服务器 Actions 可用时，使用 `router.push` 进行表单提交。
- **Don't：** 在客户端代码中暴露敏感环境变量。
- **Don't：** 将客户端专属模块导入服务器组件。
- **Don't：** 在 App Router 项目中使用 `next/router`。
- **Don't：** 滥用自定义 CSS，除非绝对必要。
- **Don't：** 使用内联样式。
- **Don't：** 混用过多状态管理模式。
- **Don't：** 过度使用客户端组件。
- **Don't：** 硬编码环境变量/秘密。
