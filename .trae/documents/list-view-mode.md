# 列表视图模式（viewMode="list"）实施计划

## Context

用户希望 Table 组件支持「列表」展示形态：一行一条数据（每行占满整行宽度），且每行内容格式可自定义。当前组件只有 `table`（el-table）与 `card`（卡片网格）两种视图。列表视图本质上是卡片视图的「单列全宽」变体：复用既有的跨页选中（`useSelection`）、行操作右键菜单、`viewMode` 受控/非受控机制，只新增一个视图分支与一个内容插槽。

## 改动内容

### 1. core：扩展 ViewMode 联合类型

文件：`packages/core/src/ui.ts`

- L23：`export type ViewMode = "table" | "card"` → `"table" | "card" | "list"`
- L18-22 与 L29-33 的注释补充 `list` 语义：一行一条数据、全宽、内容经 `#list` 插槽自定义（默认 JSON 序列化）

### 2. element-plus：Table 组件新增 list 视图分支

文件：`packages/element-plus/src/table.vue`

**Props 注释**（L74-79）：`viewMode` prop 文档补充 "list" 形态说明。

**视图切换控件**（L419-423）：radio-group 中新增 `<el-radio-button value="list">列表</el-radio-button>`，位于「卡片」之后。

**模板分支**（L427-467）：当前是 `el-table v-if === 'table'` + 卡片 `v-else`。改为三分支：

- `el-table v-if="currentViewMode === 'table'"`（不变）
- 卡片分支改为 `v-else-if="currentViewMode === 'card'"`（内容不变）
- 新增列表分支 `v-else`：

```html
<div v-else v-loading="viewLoading" class="yk-table__list">
  <div v-for="(row, index) in rows" :key="String(row[rowKey])" class="yk-table__list-item"
    :class="{ 'is-selected': showCheckbox && isRowSelected(row), 'has-actions': actions.length > 0 }"
    :title="actions.length > 0 ? '右键查看行操作' : undefined"
    @contextmenu="onCardContextMenu($event, row)">
    <el-checkbox v-if="showCheckbox" class="yk-table__list-item-checkbox"
      :model-value="isRowSelected(row)" @change="onCardCheck(row, $event)" />
    <slot name="list" :row="row" :index="index">
      <pre class="yk-table__list-item-json">{{ JSON.stringify(row, null, 2) }}</pre>
    </slot>
  </div>
  <el-empty v-if="!viewLoading && rows.length === 0" description="暂无数据" />
</div>
```

复用既有逻辑（不新增状态）：
- 选中：`isRowSelected` / `onCardCheck`（`selectedMap` 直接驱动，与卡片视图一致；`restoreSelection` 仅在切回 table 视图时需要，watch 无需改动）
- 行操作右键菜单：复用 `onCardContextMenu` 与既有的 teleport 菜单
- 空态：`el-empty` 与卡片视图一致

**样式**（style 段新增）：
- `.yk-table__list`：纵向 flex（或 block），`min-height: 120px`（同卡片容器，保证遮罩不塌陷）
- `.yk-table__list-item`：全宽、`display: flex; align-items: center; gap: 12px`、padding/border/border-radius 与卡片一致、选中态复用卡片的 `is-selected` 样式（primary 边框 + inset 光晕）
- `.yk-table__list-item-checkbox`：左侧固定，`flex-shrink: 0`
- `.yk-table__list-item-json`：同卡片 JSON 兜底样式（`margin: 0; max-height: 260px; overflow: auto; ...`）
- `.yk-table__list-item.has-actions`：`cursor: context-menu`
- 空态占满：`.yk-table__list :deep(.el-empty)`（视布局需要）

### 3. Demo：扩展现有卡片视图页为三视图演示

文件：`packages/element-plus-demo/src/pages/table/CardViewTablePage.vue`

- 页面 title/hint 更新为「表格 / 卡片 / 列表视图切换（viewMode + #card / #list 插槽）」，说明列表视图一行一条全宽、`#list` 插槽自定义行内容
- 工具栏 radio-group 新增「列表视图」选项
- 新增 `<template #list="{ row }">` 演示行式布局（头像 + 姓名 + 邮箱内联 + 年龄 tag + #id，横向单行排列，与卡片的多行布局区分开）
- `packages/element-plus-demo/src/demoPages.ts` L116：注册表 label 同步更新

### 4. 测试

文件：`packages/element-plus/src/__tests__/selection.test.ts`（复用既有 `mountTable`/`settle`/`findByName` 工具）

新增用例：
- 列表视图渲染：`setProps({ viewMode: "list" })` 后断言 `.yk-table__list-item` 数量 = 当前页行数、ElTable 不存在
- 列表视图勾选：点击列表项内 checkbox → `selectedRows` 更新；翻页后选中保留（跨页累计）
- 列表 ↔ 表格切换选中保留：list 下勾选 → setProps 回 table → ElTable 勾选态恢复（`selectedRows` 不变）

## 验证

1. 构建：`pnpm --filter "@ys.knife.crud/core" run build`（element-plus 的 typecheck 依赖 core 的 dist 类型）
2. 类型检查：`pnpm --filter "@ys.knife.crud/core" run typecheck`、`pnpm --filter "@ys.knife.crud/element-plus" run typecheck`、`pnpm --filter "@ys.knife.crud/element-plus-demo" run typecheck`
3. 单测：`pnpm --filter "@ys.knife.crud/element-plus" run test`
4. 浏览器验证（dev server + browser_use 子代理）：进入「表格 / 卡片 / 列表视图切换」demo 页：
   - 切到列表视图：一行一条数据、全宽、自定义 #list 内容生效
   - 勾选若干行 → 已选提示正确；翻页 → 选中保留；切回表格视图 → 勾选态恢复
   - 列表行右键（配置了行操作的表格）弹出操作菜单
   - 清空按钮正常
