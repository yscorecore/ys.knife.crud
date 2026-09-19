---
name: customizable-component-surface
description: 为 ys.knife.crud 组件新增「默认内置、但可被外部关闭并自行实现」的 UI 能力（入口按钮、对话框、提示条、视图模式、插槽）时使用。固定五步契约——开关 prop 只管内置 UI 显隐、能力本体始终挂载、expose open 方法进 TableApi、v-model 受控、内部状态单一数据源。不用于纯一次性 demo 改动。
---

# 可外置覆盖的内置组件能力

给组件（目前是 YsTable）增加一项内置 UI 能力时，必须让「默认开箱即用」与「外部完全自定义入口/外观」同时成立。按下列五层契约实现，顺序不能乱。

## 判定是否套用本模式

- 套用：能力有可见的内置 UI（按钮/提示条/切换控件/整块视图），且外部可能想换样式或换位置（导出按钮、列设置按钮、选中提示条、表格/卡片切换）。
- 不套用：纯内部逻辑、纯一次性 demo、外部永远不需要自定义的能力。

## 五步契约

### 1. core 契约先行 `packages/core/src/ui.ts`

- 开关放进对应的 `XxxProps` 接口并继承进 `TableProps`；JSDoc 必须写清语义「为 true 时渲染内置 X；false 时不渲染内置 X，外部可经 TableApi.xxx 触发」。开关默认行为在组件运行时声明里给。
- 外部要调用的动作（打开面板/对话框）必须加进 `TableApi` 输出接口。组件侧 `const exposed = { ... } satisfies ExposedShape` 会强制覆盖全部成员——漏实现立即编译报错，这是契约的执行保证，不要绕开。
- 受控状态（如视图模式）在 core 定义联合类型（`export type ViewMode = "table" | "card"`），禁止用魔法字符串或自造枚举；开关加 `showXxx?: boolean` 让外部连内置切换控件一起关掉。
- `ui.ts` 是纯类型文件，改完必须重建 dist（见验证节），否则下游拿到的 d.ts 是旧的。

### 2. 状态下沉到 vue composable `packages/vue/src`

- 业务状态必须 UI 库无关（不 import element-plus），element-plus 适配层只做视图。
- 同一种能力在多个视图/入口复用时，状态只能有一个数据源。反例与正解：
  - 行选中曾依赖 el-table 的 `reserve-selection`，卡片视图没有 el-table 即失效。正解是 composable 内用 rowKey 为键的 `Map` 做单一选中集合，el-table 勾选列与卡片 checkbox 都读写它。
  - el-table 改为受控：移除 `reserve-selection`，翻页/组件重挂载后调 `restoreSelection()` 恢复勾选。
- el-table data 引用变化时其内部 watcher（pre 阶段、同步）会派发一次空的 `selection-change`。恢复逻辑必须用 `watch(rows, ..., { flush: "pre" })` 且回调第一行先置 `restoring = true`，在该空事件到达前进入保护窗口，`restoreSelection` 内连续两次 `nextTick`（等行渲染 + 等 toggle 派生事件派发完）再解除。这是实测踩过的坑，不要改成 post。

### 3. element-plus 组件 `packages/element-plus/src/table.vue`

- props 一律用「运行时声明 + `PropType`」，不要用 `defineProps<Props>()` 泛型语法——SFC 编译器对跨包 re-export 类型（core 间接引用 ys.knife.query.js）解析失败时会静默丢弃 prop，导致 props 变 fallthrough attribute。
- 开关只挂在内置 UI 的 `v-if` 上；能力本体（对话框、面板、常驻容器）必须始终挂载——否则开关置 false 后外部调 expose 方法会落空。导出对话框曾因此带 `v-if="showExportExcel"`，是错误示范。
- 内置按钮与外部入口走同一个委托函数（`openConfigDialog()` / `openExportDialog()`），不要让内置按钮直接调子组件 ref 而 expose 另写一份。
- 受控切换：prop `viewMode` + `emit("update:viewMode", mode)`，模板 `:model-value` + `@change` 派发，父级即可 `v-model:view-mode`。组件内不要自己 `ref` 一份本地副本。
- 外部自定义内容用具名作用域插槽，且必须有默认回退：`$slots.empty` 存在才声明 `#empty`；`#card="{ row, index }"` 缺省渲染 `JSON.stringify(row, null, 2)`。
- 工具栏常驻条件把新开关并进去（`v-if="... || showViewSwitch || ..."`），保持固定行高不抖动。
- 模板属性用 kebab-case（`:show-view-switch`、`v-model:view-mode`）。

### 4. demo 必须演示「外置」用法 `packages/element-plus-demo`

- 新增一个 demo 页：开关显式置 false（`:show-xxx="false"`）或受控绑定，外部控件只调 `tableRef` 上的契约方法 / 绑 v-model；同时演示插槽自定义内容与默认回退两种形态。
- 在 `demoPages.ts` 追加 import 与注册项（`as const satisfies readonly DemoPageDef[]`，id 用 `table-xxx`）。
- localStorage 类持久化用独立 key，避免覆盖其他演示页配置。
- ref 用 core 契约类型化：`const tableRef = ref<TableApi | null>(null)`，不要用 SFC InstanceType。

### 5. 验证

- 改动 core/vue 源码后，构建顺序固定：`pnpm --filter "@ys.knife.crud/core" build` → 需要时 `pnpm --filter "@ys.knife.crud/vue" build` → 四个包依次 typecheck（core、vue、element-plus、element-plus-demo）。demo 的 vite alias 直连 element-plus **源码**，但 core/vue 解析到 **dist**——dist 陈旧会掩盖或伪造 TS 错误，遇到类型对不上先重建再判断。
- 真实交互逻辑用 happy-dom + @vue/test-utils 写挂载测试（放 `packages/element-plus/src/__tests__/`，文件头 `// @vitest-environment happy-dom`），用 `findComponent({ name: "ElTable" }) as VueWrapper` 取组件，直接调其 `toggleRowSelection` / 对 ElPagination `$emit("current-change", n)` 驱动，断言 `wrapper.vm.selectedRows`。覆盖跨页往返与视图切换两条路径。
- 浏览器冒烟前若重建过 core/vue dist，必须重启 demo dev server 并删除 `packages/element-plus-demo/node_modules/.vite` 预打包缓存，否则运行时混用新旧模块会出现源码无法解释的假 bug。

## 环境注意

- PowerShell 下 pnpm filter 的包名必须加引号：`pnpm --filter "@ys.knife.crud/core" build`，否则 `@ys` 被解析为展开运算符。
- 物理路径是 `packages/element-plus/`，源文件小写（`table.vue`、`exportExcelDialog.vue`、`selectionBar.vue`）；包名才是 `@ys.knife.crud/element-plus`。会话里若出现 `component-elementplus` / PascalCase 路径，一律以磁盘实际为准。
- 多行提交信息用 PowerShell here-string `$msg = @' ... '@; git commit -m $msg`，不要依赖 shell 引号续行。

## 已落地的参考实现

- 外置入口按钮：`showCustomConfig` / `showExportExcel` + `TableApi.openConfigDialog()` / `openExportDialog()`，demo「自定义列设置/导出按钮」（CustomEntryButtonsTablePage）。
- 外置提示条：`showSelectionBar` + `clearSelection()`，demo「自定义选中提示条」。
- 视图模式：`ViewMode` + `v-model:view-mode` + `showViewSwitch` + `#card` 插槽，demo「表格 / 卡片视图切换」（CardViewTablePage）；受控选中见 `packages/vue/src/selection.ts` 与 `packages/element-plus/src/__tests__/selection.test.ts`。
