# ys.knife.crud

TypeScript CRUD 工具集 monorepo，使用 pnpm workspace 管理，发布到 npm。

## 技术栈

| 能力       | 选型                                       |
| ---------- | ------------------------------------------ |
| 包管理     | pnpm workspace（monorepo）                 |
| 语言       | TypeScript ^5.9（最新稳定版）               |
| 构建       | tsup（同时产出 ESM / CJS + .d.ts）         |
| 单元测试   | Vitest                                     |
| 版本发布   | Changesets                                 |
| 代码规范   | ESLint 9（flat config + typescript-eslint）|

## 目录结构

```
ys.knife.crud/
├── packages/
│   ├── core/          # @ys.knife.crud/core —— CRUD 核心（数据源契约、CrudManager、内存实现）
│   └── utils/         # @ys.knife.crud/utils —— 通用工具（分页、数组、深拷贝）
├── .changeset/        # Changesets 版本管理
└── eslint.config.js
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行所有单元测试
pnpm test

# 类型检查 / Lint
pnpm typecheck
pnpm lint
```

## 新增一个包

```bash
mkdir -p packages/<name>/src/__tests__
# 复制 packages/utils 下的 package.json / tsconfig.json / tsup.config.ts / vitest.config.ts 改名即可
```

包命名约定：`@ys.knife.crud/<name>`，内部互相引用使用 `"workspace:*"`。

## 发布到 npm

```bash
# 0. 首次使用先登录
npm login

# 1. 记录变更（交互式）
pnpm changeset

# 2. 消费 changeset，更新版本号与 CHANGELOG
pnpm version-packages

# 3. 构建并发布
pnpm release
```

> scoped 包默认 private 发布，`.npmrc` 与 changesets 已配置 `access=public`，发布时无需额外加 `--access public`。

## 用法示例

```ts
import { CrudManager, MemoryDataSource } from "@ys.knife.crud/core";

interface User {
  id: number;
  name: string;
  email: string;
}

const manager = new CrudManager(new MemoryDataSource<User>("users"));

await manager.create({ name: "alice", email: "alice@example.com" });
const page = await manager.list({ page: 1, pageSize: 10 });
console.log(page.total); // 1
```
