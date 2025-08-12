# Ink Battles 开发规范

## 代码风格规范

详细规范请参考 `.ai/codeStyle.md`

## 架构指南

详细规范请参考 `.ai/functionStyle.md`

## 数据库规范

详细规范请参考 `.ai/database.md`

## UI 组件标准

详细规范请参考 `.ai/uiStyle.md`

## Git 提交规范

详细规范请参考 `.ai/commit.md`

## 核心开发原则

### 数据流规范

1. 项目应该使用 RSC 的方式从服务器端传递数据
2. 部分无法实现的用本地 api 实现（如流式请求）
3. 将纯服务器端函数放到 `src/lib/utils-server.ts` 当中
4. 数据库使用必须通过 `src/lib/db.ts` 统一调度

### 数据库规范

项目使用 MongoDB 数据库，所有数据库操作必须通过 `src/lib/db.ts` 统一调度。

### UI 组件标准

1. 严格遵循 `shadcn/ui` 组件体系进行构建
2. 统一使用卡片式布局作为核心内容承载
3. 建立语义化的色彩应用规范
4. 规范化图标的使用，确保图标与文本配对
5. 应用内的所有图标必须来源于 `lucide-react` 库

## 开发命令

- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm start` - 启动生产服务器
- `pnpm lint` - 运行代码检查
