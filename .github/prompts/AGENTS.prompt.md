---
mode: agent
---

## Next.js 16 (App Router), React 19, TypeScript & ShadCN UI 开发规范 (2025)

**角色定位与专业知识：**
作为一名精通 Next.js 16 (App Router)、React 19、TypeScript 和 ShadCN UI 的高级开发者，我将专注于生成清晰、可读、高性能的代码，并严格遵循2025年的最新最佳实践。

---

### 1. 项目结构与App Router

- **src/ 根目录结构：** 所有源代码统一放置在 `src/` 目录下，确保代码组织的清晰性和一致性。
- **App Router 优先：** 始终使用 Next.js 16 的 App Router (`src/app/` 目录) 作为核心路由和渲染机制。
- **共置原则 (Colocation)：** 将路由处理程序、加载/错误状态、页面级组件、布局及私有组件共置于 `src/app/` 目录下，与对应路由紧密关联。
- **页面角色明确（解耦核心）：** `page.tsx` **仅作为“编排者” (Orchestrator)**。其职责限制为：1. 获取数据；2. 定义元数据；3. 导入并组装各个组件。**严禁在 `page.tsx` 中编写复杂的 UI 标记或业务逻辑**，必须将其拆分为独立的组件。
- **路由组：** 使用路由组 `()` 组织路由，实现逻辑分组而不影响URL结构。
- **复杂布局：** 通过并行路由 (Parallel Routes) 或拦截路由 (Intercepting Routes) 实现复杂布局和模态框等高级UI模式。
- **组件分类组织：** 共享的、可复用的 UI 组件存放于 `src/components/` 目录，按功能域进行详细分类：
  - `src/components/ui/` - ShadCN UI 基础组件
  - `src/components/common/` - 通用组件（如头部、主题切换等）
  - `src/components/layouts/` - 页面级布局组件（按页面功能分类）
  - `src/components/business/` - **业务组件**（封装特定业务逻辑的组件，保持 page 简洁）
- **共享逻辑/工具：** 通用工具函数、类型定义、常量等共享逻辑按功能域组织：
  - **功能域工具函数 (`@/utils/`)：** 按功能域分类的工具函数统一放置在 `src/utils/` 目录：
    - `@/utils/auth/` - 认证相关工具函数（含客户端 `client.ts`、服务器端 `server.ts` 和共享 `common.ts`）
    - `@/utils/common/` - 通用工具函数（如邮件验证等）
    - `@/utils/afdian/` - 第三方服务集成工具
  - **客户端/服务器分离：** 在同一功能域内，通过明确的文件命名和指令区分：
    - 客户端专用：`client.ts` 文件标记 `"use client"`
    - 服务器专用：`server.ts` 文件标记 `"use server"` 和 `server-only`
    - 共享函数：`common.ts` 或 `index.ts` 文件
  - **核心库函数 (`@/lib/`)：** 核心框架和基础设施相关函数：
    - `@/lib/db.ts` - 数据库操作统一封装（所有数据库操作必须通过此文件调度）
    - `@/lib/constants.ts` - 全局常量定义
    - `@/lib/config.ts` - 配置管理
    - 其他纯服务器端核心函数使用 `server-only` 包强制检查
- **类型定义：** 所有 TypeScript 类型定义按域分类放置在 `src/types/` 目录：
  - `src/types/auth/` - 认证相关类型
  - `src/types/common/` - 通用类型
  - `src/types/database/` - 数据库模型类型
  - `src/types/callback/` - 回调函数类型
- **状态管理：** 使用 Zustand 进行状态管理，状态文件放置在 `src/store/` 目录。
- **自定义 Hooks：** 自定义 React Hooks 放置在 `src/hooks/` 目录。
- **静态资源：** 图像、字体等静态资源放置在 `public/` 目录。
- **全局布局：** 应用的全局布局定义在 `src/app/layout.tsx`。
- **命名约定：**
  - 组件文件：`PascalCase.tsx` (例如 `Button.tsx`, `UserProfile.tsx`)。
  - 目录：`kebab-case` (例如 `user-profile`, `data-display`)。

### 2. 代码风格与TypeScript

- **TypeScript 强制：** 始终使用 TypeScript，并启用严格模式 (`strict: true`)。明确定义类型，**严禁使用 `any`**，优先使用 `unknown` 或更具体的类型。
- **组件类型：** 优先使用 React 19 函数式组件、Hooks 和 Next.js 16 服务器组件。避免使用 `React.FC`。
- **命名约定：**
  - 组件、类、类型 (Type)、接口 (Interface)：`PascalCase` (例如 `UserCard`, `IUserData`)。
  - 变量、函数、Hooks：`camelCase` (例如 `userName`, `fetchPosts`, `useActionState`, `useOptimistic`)。
  - 常量：`SCREAMING_SNAKE_CASE` (例如 `MAX_RETRIES`)。
  - 描述性名称：使用具有描述性的名称，避免无意义的缩写。
- **Props 定义：** 通过接口 (`interface`) 或类型别名 (`type`) 明确定义 props 类型，并在函数签名中进行类型化。明确包含 `children`（如果组件接收子元素）。
- **Ref 处理 (React 19)：** 在函数组件中，将 `ref` 作为常规 prop 进行接收和处理，**避免使用 `forwardRef`**。
- **函数风格：** 优先使用箭头函数 (`=>`)，特别是在回调函数和短函数体场景。
- **括号风格：** 采用 K&R 风格 (左括号不换行)。
- **缩进风格：** 强制使用 2 个空格进行缩进，保持全局一致性。
- **工具链：** 强制使用 ESLint 和 Prettier 进行代码风格和质量检查，并在提交前自动格式化。

### 3. 注释与代码组织

- **函数注释：** 每个函数都必须有明确的 JSDoc 风格注释，说明其功能、参数和返回值。
- **逻辑注释：** 复杂或非直观的逻辑部分需要添加适当的行内注释，解释代码意图和实现方式。
- **分组注释：** 不同功能或逻辑块的代码应使用注释进行适当分组和分隔。
- **结构清晰：** 代码文件的组织结构应该清晰，便于快速理解和维护。
- **封装原则：** 避免使用全局变量。尽量将数据和操作封装在函数或组件内部，遵循单一职责原则。
- **简洁性：** 循环和条件语句保持逻辑简洁，避免嵌套过深（建议不超过三层）。
- **单一职责原则与拆分：** 当组件的逻辑变得复杂或功能过多时，应立即将其拆分为更小、职责单一的子组件或Hooks，以增强可读性和复用性。

### 4. 导入规范

- **导入顺序：**
  1.  Node.js 内置模块 (例如 `path`, `fs`)。
  2.  第三方库 (例如 `react`, `next`, `lodash`)。
  3.  `@/` 绝对路径导入。
  4.  `../` 相对路径导入 (从上级目录)。
  5.  `./` 相对路径导入 (当前目录或子目录)。
  6.  样式文件。
- **路径格式：**
  - **当前目录及子目录：** 只能使用 `./文件名` 或 `./子目录/文件名` 的相对导入。
  - **同一层级或下级目录：** 统一使用 `./` 开头的相对路径，不允许出现 `../`。
  - **层数不高的上级目录：** 统一使用 `../` 开头的相对路径，**避免出现 `../../../` 这类超过两层以上的相对路径**。
  - **跨目录/公共模块：** 统一使用 `@/路径/路径` 绝对路径导入，用于公共模块、全局工具、核心组件等。
- **导入格式：** 优先使用命名导入 `import { Component } from "library"`，避免使用默认导入 `import Component from "library"`，以利于 Tree Shaking 和代码一致性。

### 5. 服务器组件 (Server Components)

- **角色定位：** **编排者 (Orchestrator)**。所有 `app/` 目录下的组件默认都是服务器组件。
- **瘦组件原则 (Thin Components)：** **严禁**在服务器组件中编写复杂的逻辑。它们的主要职责是：1. 调用 Server Actions/Utils 获取数据；2. 将数据传递给子组件。
- **组合模式 (Composition Pattern)：** 优先使用 `children` 属性或 Slot 模式来组合组件，而不是通过深层 Props 传递 (Prop Drilling)。**这能有效解耦布局与具体内容**。
- **数据传递：** 推荐通过 Server Actions 获取数据，然后将数据作为 props 传递给服务器组件或客户端组件。
- **限制：** **严禁在服务器组件中使用客户端 Hooks (如 `useState`, `useEffect`) 或浏览器 API (如 `window`, `document`)**。
- **强制检查：** 结合 `server-only` 包以在编译时强制检查服务器组件不导入客户端专属模块。
- **流式传输/加载：** 结合 `Suspense` 边界实现流式传输，提供细粒度的加载状态和更快的首屏渲染。
- **SEO 优化：** 在 `layout.tsx` 或 `page.tsx` 中使用 `generateMetadata` 进行静态或动态的 SEO 元数据配置。
- **完全动态：** 对于需要完全动态、不缓存的渲染，在 Server Actions 内部使用 `unstable_noStore()`。

### 6. 客户端组件 (Client Components)

- **明确标记：** 必须在文件顶部明确标记 `"use client"`。
- **职责：** **交互叶子节点**。仅用于包含用户交互、状态管理和浏览器 API 等客户端专属逻辑。**尽量将客户端组件推向组件树的末端**，保持父组件为服务器组件。
- **导航：** 使用 `next/navigation` 提供的 `useRouter`、`usePathname` 等 Hooks，**严禁使用 `next/router`**。
- **表单状态：** 结合 Server Actions，使用 `useFormStatus` (获取表单提交状态)、`useFormState` (处理表单错误或结果) 和 `useOptimistic` (实现乐观更新) 处理表单状态。
- **数据交互：** 所有需要数据获取或变更的客户端交互，都必须通过调用 Server Actions 来实现。
- **限制：** 仅在真正需要交互式、有状态的部分使用客户端组件，避免过度使用，最小化客户端包体积。

### 7. 数据获取与服务器 Actions (核心)

- **服务器 Actions 定义：** 必须使用 `"use server"` 指令在函数顶部定义服务器 Actions，或标记整个文件为 `"use server"`。
- **Server Actions 优先：** **所有数据获取 (reads)、数据变更 (mutations)、表单提交以及任何需要与后端交互的逻辑，都应优先且强制使用服务器 Actions 实现**。这是 Next.js 16 的核心范式，旨在简化数据流和提高安全性。
- **逻辑解耦 (Service Layer)：** **Server Actions 仅作为网关 (Gateway)**。
  - **严禁**在 Server Action 函数体内直接编写复杂的数据库查询或业务逻辑。
  - **必须**调用 `@/lib` 或 `@/services` 中的纯函数来处理实际业务。Server Action 负责处理请求参数、权限校验、调用 Service 层，并返回统一格式的响应。
- **调用方式：** 服务器 Actions 可从服务器组件和客户端组件直接调用。
- **客户端 Hooks 配合：** 在客户端组件中，结合 `useFormStatus` 跟踪表单提交状态、`useFormState` 处理表单提交后的结果或错误，以及 `useOptimistic` 实现UI的乐观更新。
- **禁止旧式表单提交：** **严禁在表单提交后使用 `router.push` 或 `router.refresh` 来触发数据刷新**。应依赖 Server Actions 完成数据变更和自动重渲染。
- **数据获取与缓存 (通过 Server Actions)：**
  - Server Actions 内部应利用 `fetch` API 及其 `revalidate` 选项 (`fetch(url, { next: { revalidate: <seconds> } })`) 实现细粒度的缓存控制。
  - 使用 `Promise.all` 在 Server Actions 内部进行并行数据获取，提高效率。
  - 利用 `React.cache` 优化 Server Actions 内部相同请求的去重，避免重复数据获取。
  - 在 Server Actions 内部，可以使用 `React.use` Hook 读取 Promise 或 Context。
- **Serverless 环境：** 最小化服务器 Actions 中的外部请求，优化冷启动时间。

### 8. 中间件与Edge Runtime

- **中间件：** 使用 `middleware.ts` 进行路由拦截、认证、重定向、重写和国际化处理。
- **Edge Runtime：** 优先选择 Edge Runtime (`export const runtime = 'edge'`) 以获得更快的启动时间和更低的延迟，适用于轻量级、I/O 密集型任务。
- **处理：** 在中间件中高效处理 cookies、headers 和动态重写。
- **注意：** 留意 Edge Runtime 的约束，避免使用 Node.js 特有的 API。

### 9. 样式与资产

- **主要样式方案：** **优先且主要使用 Tailwind CSS 工具类** 进行一致性样式设计。
- **自定义 CSS：** 仅在特殊、复杂或 Tailwind 无法直接实现的场景下，才使用自定义 CSS（例如 CSS Modules）。
- **类组织：** 逻辑地组织 Tailwind 类（例如：布局、间距、颜色、排版），遵循原子化设计原则。
- **响应式与状态变体：** 在标记中广泛使用响应式 (`sm:`, `md:`, `lg:`) 和状态变体 (`hover:`, `focus:`, `dark:`)。
- **指针交互反馈：** **所有交互元素（如按钮、链接、可点击的卡片/图标）必须显式设置 `cursor-pointer`**，确保鼠标悬停时指针变为手型，提供清晰的视觉反馈。
- **统一设计语言：** **强烈依赖 Tailwind 类**，而非内联样式或独立的外部 CSS 文件，以维护统一的设计语言和可维护性。
- **图片优化：** 统一使用内置的 `<Image />` 组件进行图片优化、懒加载和响应式处理。
- **字体优化：** 使用 `@next/font` 或 React 19 新的字体 API 进行字体优化，自动处理字体加载和性能。
- **ShadCN UI：**
  - 组件放置在 `@/components/ui/` 目录下。
  - 其样式完全依赖 Tailwind CSS，确保正确配置并清除未使用的 CSS。
  - 使用 `npx shadcn@latest add <component>` 命令添加组件。

### 10. UI/UX 与 ShadCN UI 风格推荐 (核心)

- **ShadCN UI 体系：** 严格遵循 `shadcn/ui` 组件体系进行构建。所有新功能界面都应优先复用或组合 `shadcn/ui` 提供的基础组件（如 `Card`, `Button`, `Switch`, `Progress` 等），**避免从零开始造轮子**，以确保整个应用在视觉风格、交互行为和代码结构上保持高度一致性和可维护性。
- **原子化构建与组合 (Composition)：**
  - **不要创建巨大的单一组件**。例如，不要创建一个包含所有逻辑的 `UserDashboard`。
  - **应当创建** `UserProfile`, `UserSettings`, `UserStats` 等独立的小组件，然后在页面中**组合**它们。这能极大降低耦合度。
- **卡片式布局：** 统一使用卡片式布局作为核心内容承载。所有独立的功能区块（如输入区、结果展示区、模式选择区）都必须使用 `Card` 组件包裹，并统一应用 `className="border-0 bg-white/80 shadow-lg backdrop-blur-sm"` 样式，形成具有辨识度的“毛玻璃”视觉风格，增强界面的整体感和层次感。
- **语义化色彩：** 建立语义化的色彩应用规范。颜色使用必须有明确的业务含义：
  - 蓝色 (`-blue-`)：应用于主要的交互、选中状态和功能性图标。
  - 绿色 (`-green-`)：专门用于表示成功/有效状态提示。
  - 红色 (`-red-`)：专门用于表示失败/无效状态提示。
  - 品牌色（如粉色 `-pink-`、紫色 `-purple-`）：用于特定的号召性操作 (Call to Action)，如赞助和社群链接。
- **图标规范：** 规范化图标的使用，确保图标与文本配对。应用内的所有图标必须来源于 `lucide-react` 库。图标不应单独作为功能入口，而是作为文本标签的视觉辅助，放置在文本左侧，并使用 `flex` 和 `items-center` 确保对齐，例如，`<Gauge className="..."/> 评分模式`。
- **间距与布局：** 采用原子化的间距和布局原则。组件内部元素的间距应遵循 `tailwindcss` 的间距尺度（如 `space-y-4`, `gap-2`），形成有韵律的垂直和水平间距。对于多列布局，应使用 `grid` 系统（如 `md:grid-cols-3`），以实现清晰且具备响应式能力的布局结构。
- **组件内部状态：** 优先封装组件内部状态，谨慎处理跨组件状态。组件应优先管理自身的状态（如 `WriterAnalysisModes` 中的 `isModesExpanded`）。对于必须在父子组件间传递的状态和方法（如 `articleText` 和 `setArticleText`），props 命名应清晰明了。当状态传递超过两层时，应考虑使用 React Context 或 Zustand 等轻量级状态管理方案，以避免过深的属性钻取（Prop Drilling）。
- **即时反馈：** 为所有交互行为提供即时、明确的反馈。用户的任何操作都应获得视觉响应，这包括：按钮的 `disabled` 禁用状态，输入框的 `focus` 状态边框高亮，使用 `HoverCard` 为复杂选项提供非侵入式的解释说明，以及在执行异步操作时（如校验 Token）提供明确的加载中提示。
- **指针状态 (Cursor States)：** **强制要求**所有可交互元素（`Button`, `Link`, `Switch`, `Select` 以及自定义的可点击 `div`）在 `hover` 状态下必须表现出正确的鼠标指针样式（通常是 `cursor-pointer`），而在禁用状态下必须表现为 `cursor-not-allowed`。禁止出现用户可点击但鼠标指针仍为默认箭头的情况。
- **信息层级结构：** 固化信息层级结构，统一卡片内容组织。在 `Card` 组件内部，必须严格遵循 `CardHeader` > `CardTitle` + `CardDescription`，以及 `CardContent` 的内容组织范式，这确保了用户在浏览不同功能卡片时，能以相同的心理模型快速定位标题、说明和主体内容。
- **可访问性 (A11y)：** 将可访问性（A11y）作为组件开发的基本要求。确保所有交互元素（`Button`, `Link`, `Switch`, `input`）都能通过键盘完全访问和操作。对于 `HoverCard` 等组件，要确保其触发和内容对屏幕阅读器友好。在设计点击区域时，要保证其尺寸足够大，便于移动端用户和特殊需求用户操作。
- **文本内容：** 除内容外，组件硬编码的文本应尽量避免使用 emoji 表情，以保持专业性和跨平台一致性。
- **文档元数据 (React 19)：** 利用 React 19 原生支持的 `<head>` 管理方式，统一管理 `title`、`link`、`meta` 标签，改善 SEO 和页面元数据控制。
- **样式表管理：** 控制加载顺序，确保关键样式优先加载，并利用构建工具自动去重。
- **脚本加载：** 使用 `script async` 后台加载非关键脚本，利用构建工具自动去重，确保关键资源优先加载。

### 11. 性能优化

- **渲染优化：** 使用流式传输 (Streaming) 和 Suspense 加快初始渲染时间。
- **代码分割：** 在客户端组件中动态导入大型依赖 (`React.lazy` 和 `next/dynamic`)，减少初始加载包体积。
- **重渲染优化：** 在客户端组件中，谨慎使用 `React.useMemo` 和 `React.useCallback` 避免不必要的重渲染。
- **数据缓存：** 充分利用 Server Actions 内部的 `fetch` 缓存机制、`revalidate` 选项和 `React.cache` 进行请求去重。
- **客户端包体积：** 避免阻塞主线程，利用代码分割或将逻辑迁移到服务器组件。
- **图像/字体优化：** 使用 Next.js 内置的 `<Image />` 和 `@next/font` 进行优化。

### 12. 工具函数组织架构 (`@/utils/`)

- **功能域优先原则：** 所有工具函数按业务功能域组织在 `@/utils/` 目录下，而非按运行环境分离。
- **标准目录结构：**
  ```
  @/utils/
  ├── auth/           # 认证功能域
  │   ├── client.ts   # 客户端专用 (use client)
  │   ├── server.ts   # 服务器专用 (use server + server-only)
  │   ├── common.ts   # 共享工具函数
  │   └── index.ts    # 统一导出
  ├── common/         # 通用功能域
  │   ├── mail.ts     # 邮件相关 (use server + server-only)
  │   └── index.ts
  └── afdian/         # 第三方服务集成
      └── sponsors.ts
  ```
- **文件命名约定：**
  - `client.ts` - 客户端专用函数，必须标记 `"use client"`
  - `server.ts` - 服务器专用函数，必须标记 `"use server"` 和 `import "server-only"`
  - `common.ts` - 客户端/服务器共享的安全函数
  - `index.ts` - 功能域的统一导出入口
- **导入规范：**
  - 优先从功能域统一导入：`import { functionName } from "@/utils/auth"`
  - 避免直接导入具体文件：`import { functionName } from "@/utils/auth/client"`
- **与 `@/lib/` 的分工：**
  - `@/utils/` - 业务功能域的工具函数
  - `@/lib/` - 框架基础设施（数据库、配置、常量等）

### 13. SEO

- **元数据管理：** 统一使用 `generateMetadata` 函数在 `layout.tsx` 或 `page.tsx` 中进行 SEO 元数据管理，包括 `title`、`description`、`og:image` 等。
- **React 19 Head API：** 结合 React 19 的新特性，更灵活地管理 `<head>` 中的 `link` 和 `meta` 标签。
- **SSR/SSG 优势：** 充分利用 Next.js 的 SSR/SSG 能力，确保搜索引擎能抓取到完整的页面内容。
- **语义化 HTML：** 使用语义化 HTML 结构，提高内容可理解性。

### 14. 部署与开发设置

- **部署平台：** 优先考虑 Vercel 进行部署，或自托管 (Node/Docker)。
- **测试：** 彻底测试 SSR 和静态输出，确保在生产环境下的表现一致。
- **环境变量：** 区分客户端 (`NEXT_PUBLIC_`) 和服务器端环境变量，绝不在客户端代码中暴露私有值。
- **静态资产：** 所有静态资源放在 `public/` 目录。
- **工具：** 强制使用 TypeScript、ESLint、Prettier。
- **Monorepo：** 对于大型项目，考虑使用 Pnpm workspaces 或 Turborepo 进行 Monorepo 管理。

### 15. 测试与Linting

- **Linting：** 使用 `next lint` (ESLint) 并紧密集成 Prettier，确保代码质量和风格一致性。
- **测试框架：** 优先选择 Jest 结合 React Testing Library 进行单元和集成测试，或 Cypress 进行端到端测试。
- **文件位置：** 测试文件应靠近相关组件或模块，遵循 `*.test.tsx` 或 `*.spec.tsx` 命名约定。
- **覆盖率：** 争取达到高代码覆盖率，特别是核心业务逻辑。

### 16. 最佳实践 (Dos & Don'ts)

- **Do：**
  - 在 `app` 目录组织路由和组件，遵循共置原则。
  - 利用服务器组件进行初始渲染，但**仅作为编排者，避免在其中编写复杂逻辑**。
  - **优先且广泛使用服务器 Actions 进行所有数据获取、数据变更和表单提交。**
  - **使用组合模式（Composition）来构建页面，将业务逻辑下沉到专门的 Service 层。**
  - 使用 `next/link` 进行内部路由和预取。
  - 使用 `loading.tsx` 文件实现加载状态和 `Suspense`。
  - 仔细分离服务器和客户端逻辑，并使用 `server-only`/`client-only` 包进行强制检查。
  - 按功能域组织工具函数到 `@/utils/` 目录，通过明确的文件命名区分客户端/服务器专用函数。
  - 广泛使用 Tailwind 工具类和 ShadCN UI 组件。
  - **确保所有交互元素（按钮、链接等）在悬停时显示正确的手型指针 (`cursor-pointer`)。**
  - 最小化依赖，并保持依赖更新。
  - 使用 TypeScript 严格模式和高级特性。
  - 在服务器 Actions 内部使用 `React.use` Hook 读取 Promise 或 Context。
  - 为所有用户交互提供即时、明确的反馈。

- **Don't：**
  - 混用 `pages` 和 `app` 目录进行路由。
  - **严禁生成“上帝组件”：即一个组件包含几百行代码并处理多种业务逻辑。**
  - **在客户端组件或服务器组件中直接使用 `fetch` 进行数据获取；所有数据交互都应通过服务器 Actions。**
  - **在服务器 Actions 可用时，使用 `router.push` 或 `router.refresh` 进行表单提交或数据刷新。**
  - 在客户端代码中暴露敏感环境变量。
  - 将客户端专属模块导入服务器组件。
  - 在 App Router 项目中使用 `next/router`。
  - 滥用自定义 CSS 或内联样式，除非绝对必要且无 Tailwind 替代方案。
  - 混用过多状态管理模式，保持简单。
  - 过度使用客户端组件，最小化客户端包体积。
  - 硬编码环境变量或敏感信息。
  - 在组件硬编码文本中滥用 Emoji 表情。
