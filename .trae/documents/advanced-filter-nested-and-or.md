# 高级查询面板：支持任意嵌套 AND/OR 组合

## Context

当前 `YsAdvancedFilterPanel`（封装于上一轮会话）采用**单层统一组合符**：所有条件行扁平排列，全部用 AND 或全部用 OR。这是当时为避免无括号时 `a AND b OR c` 优先级歧义而刻意做的简化。

用户在预览后提出新需求：**条件可以任意嵌套组合**，例如外层用 AND、内层用 OR。这意味着支持 `a AND (b OR c) AND (d OR e)` 这类带括号的结构化查询。

为达成此能力，需要把扁平 `AdvancedCondition[]` 升级为**树形结构**（叶子节点=条件行，分组节点=带组合符的子组），composable 改为递归管理树、递归聚合 FilterInfo，element-plus 改用**递归子组件**呈现嵌套层级。

该组件尚未 commit、暂无外部消费方，可直接重构不维护向后兼容。

## 目标

- 数据契约支持任意深度嵌套的 AND/OR 树
- composable 提供树的增删改 + 递归聚合 API
- UI 用递归子组件呈现嵌套层级，每层有组合符切换与「+ 条件 / + 嵌套组」入口
- FilterInfo 聚合时单子节点透传（避免 `(a)` 多余括号），空组返回 null 跳过父级聚合
- 四包 build + typecheck 全过，浏览器实测嵌套查询正确

## 设计方案

### 1. core 类型契约（`packages/core/src/advancedFilter.ts`）

保留 `AdvancedCondition`（叶子）原样不动，新增分组与联合类型：

```ts
export interface AdvancedConditionGroup {
  id: string;
  combinator: AdvancedCombinator;
  children: AdvancedConditionNode[];
}

export type AdvancedConditionNode = AdvancedCondition | AdvancedConditionGroup;

export function isConditionGroup(node: AdvancedConditionNode): node is AdvancedConditionGroup {
  return "children" in node;
}
```

`OPERATOR_LABELS / FIELD_TYPE_OPERATORS / isRangeOperator / isMultiValueOperator / defaultOperatorForType / inferFieldType / inferColumnFieldType / AdvancedCombinator / AdvancedFieldType` 全部保留不变。

### 2. vue composable 重写（`packages/vue/src/filter/advancedFilter.ts`）

`useAdvancedFilter` 改为管理一棵根 group：

- 状态：`rootGroup = ref<AdvancedConditionGroup>(newGroup())`，`newGroup()` 默认 AND + 1 个空 leaf
- 保留：`fieldTypeMap / fieldTypeOf / operatorsOf / emptyValue / isConditionEmpty / buildConditionFilter`（仅针对 leaf，逻辑不变）
- 新增辅助：
  - `newLeaf()` / `newGroup()` 工厂
  - `findNode(id, group?)` 递归查找节点
  - `findParentGroup(id, group?)` 递归查找所属父 group
- 操作 API（全部基于 id 定位）：
  - `addLeaf(parentId, index?)`：在指定 group 内追加新 leaf
  - `addNestedGroup(parentId, index?)`：在指定 group 内追加嵌套 group（默认 AND + 1 空叶）
  - `removeNode(id)`：删任意节点（root 自身不允许删）；删到根 children 为空也保留根结构
  - `changeField(id, propertyPath)` / `changeOperator(id, op)`：改为按 id 找 leaf 后 mutate
  - `setGroupCombinator(groupId, comb)`：改 group 组合符
- 聚合（递归）：
  - `buildNodeFilter(node)`：group → 递归子项过滤 null；空 children 返回 null；单子项透传（避免 `(a)` 多余括号）；多子项按 `combinator` 用 `FilterInfo.createAnd / createOr` 聚合。leaf → 沿用 `buildConditionFilter`
  - `filter = computed(() => buildNodeFilter(rootGroup.value) ?? emptyFilter())`
  - 跨包 dts 断言保留 `as unknown as FilterInfo`
- `reset()`：`rootGroup.value = newGroup()`

返回签名变化：移除 `combinator / conditions / addCondition / removeCondition`，新增 `rootGroup / addLeaf / addNestedGroup / removeNode / setGroupCombinator / isConditionGroup`。`filter / reset / changeField / changeOperator / fieldTypeOf / operatorsOf / isConditionEmpty` 保留。

### 3. element-plus 组件层

#### `advancedValueEditor.vue`：**不变**（只管 leaf 值控件，与嵌套无关）

#### 新增 `advancedConditionGroup.vue`（递归子组件）

- `defineOptions({ name: "YsAdvancedConditionGroup" })` 启用 SFC 自引用
- Props：`group: AdvancedConditionGroup`（required）、`level: number`（默认 0）
- 模板结构：
  ```
  <div class="yk-adv-group" :style根级 level=0 无边框, level>=1 带左侧色条 + 缩进>
    <header>
      <span>满足</span>
      <el-radio-group v-model="group.combinator" size="small">
        <el-radio-button value="and">全部</el-radio-button>
        <el-radio-button value="or">任一</el-radio-button>
      </el-radio-group>
      <span>条件</span>
      <el-button link type="primary" @click="addLeaf(group.id)">+ 条件</el-button>
      <el-button link type="primary" @click="addNestedGroup(group.id)">+ 嵌套组</el-button>
      <el-button v-if="level > 0" link type="danger" @click="removeNode(group.id)">删除组</el-button>
    </header>
    <div class="children">
      <template v-for="child in group.children" :key="child.id">
        <div v-if="isConditionGroup(child)" class="nested">
          <YsAdvancedConditionGroup :group="child" :level="level + 1" />
        </div>
        <div v-else class="row">
          <el-select v-model="child.propertyPath" filterable @change="changeField(child.id, child.propertyPath)" />
          <el-select v-model="child.op" filterable @change="changeOperator(child.id, child.op)" />
          <YsAdvancedValueEditor :field-type :op :options :options-loading :value-format v-model="child.value" />
          <el-button link type="danger" @click="removeNode(child.id)">删除</el-button>
        </div>
      </template>
      <div v-if="group.children.length === 0" class="empty">暂无条件,点击「+ 条件」或「+ 嵌套组」</div>
    </div>
  </div>
  ```
- 样式：`level >= 1` 的 group 加 `padding-left: 16px; border-left: 2px solid var(--el-border-color, #dcdfe6); margin-left: 4px`；不同 level 可循环用 3-4 种淡色条做视觉区分（可选）

#### `advancedFilterPanel.vue`（改写为薄壳）

- 移除：顶部组合器切换、conditions 渲染循环
- 主体改为：`<YsAdvancedConditionGroup :group="rootGroup" :level="0" />`
- 保留：查询/重置按钮、面板级 `@keydown.enter="onSearch"`、`defineExpose({ filter, reset })`
- enum 选项加载逻辑保留，`watch(rootGroup, ..., { deep: true, immediate: true })` 改为**递归遍历**树收集所有 enum 字段的 propertyPath，逐个 `ensureOptions`

#### `packages/element-plus/src/index.ts`

注册 + 导出 `YsAdvancedConditionGroup`（与 `YsAdvancedFilterPanel` 同级）：
- 加 `import` + 加入 named export + 加入 plugin install + 加 props 类型导出

### 4. demo（`AdvancedFilterPanelPage.vue`）

`columns` / `optionSources` / 事件 handler 全部不变。仅更新 `hint` 文案，提到「支持任意嵌套 AND/OR 组合」。

## 关键决策点（已选默认值）

| 决策 | 选择 | 理由 |
|---|---|---|
| 嵌套深度 | 不限制 | UI 自然限制（5 层以上已很挤）；约束放在产品层而非组件层 |
| 空 group 行为 | 保留结构，聚合跳过 | 便于用户继续编辑，不被意外删空 |
| UI 呈现 | 缩进式默认全展开 | 编辑态查询面板，直观看到层级；折叠树是查看态方案 |
| 「+ 嵌套组」入口 | 每个 group 顶部都有 | 任意位置都能起嵌套，灵活度最高 |
| 单子节点优化 | group 仅 1 个有效子节点时透传，避免 `(a)` 多余括号 | toString 输出更自然 |
| 跨 group 拖拽 | 不做 | 复杂度高；增删/嵌套已覆盖核心需求 |
| 同字段多次出现 | 允许 | 用户可能要 `name contains "a" OR name contains "b"` |

## 涉及文件

| 文件 | 改动类型 |
|---|---|
| `packages/core/src/advancedFilter.ts` | 新增 `AdvancedConditionGroup` / `AdvancedConditionNode` / `isConditionGroup`，其他不动 |
| `packages/vue/src/filter/advancedFilter.ts` | 重写 `useAdvancedFilter` 为树形管理；返回签名变化 |
| `packages/element-plus/src/filter/advancedConditionGroup.vue` | **新建** 递归子组件 |
| `packages/element-plus/src/filter/advancedFilterPanel.vue` | 改写为薄壳，主体改为渲染 root group |
| `packages/element-plus/src/filter/advancedValueEditor.vue` | 不动 |
| `packages/element-plus/src/index.ts` | 注册 + 导出 `YsAdvancedConditionGroup` |
| `packages/element-plus-demo/src/pages/filter/AdvancedFilterPanelPage.vue` | 仅 hint 文案更新 |

## 验证

### 构建
按依赖顺序在四个包执行 build + typecheck：
1. `pnpm --filter @ys.knife.crud/core build`
2. `pnpm --filter @ys.knife.crud/vue build`
3. `pnpm --filter @ys.knife.crud/element-plus build`
4. `pnpm --filter @ys.knife.crud/element-plus-demo typecheck`

### 浏览器实测（dev server 已在 http://localhost:5173 运行）
从首页点「高级查询面板（动态条件 + AND/OR 组合）」进入：
1. **默认结构**：root AND + 1 个空叶，FilterInfo 显示 `(empty)`
2. **基本 AND**：填两行值，验证 `(a) and (b)` 形态
3. **嵌套 OR**：root 加一个嵌套组 → 切 OR → 加两行值，验证 `(leaf0) and ((leaf1) or (leaf2))` 形态
4. **单子节点透传**：嵌套组只填 1 个值，验证不带多余括号
5. **删除**：删单个 leaf、删嵌套组（level > 0）、删根（应被阻止）
6. **重置**：清空回 root + 1 空叶
7. **回车提交**：在任意值输入框按 Enter，触发查询按钮
8. **enum 异步加载**：在嵌套组里加 status 字段，验证选项数据源加载

### 已知限制（不阻塞本任务）
- el-select 选项点击在 CDP 自动化环境下可能被截获（同上一轮），类型联动建议手工验证
- 嵌套深度无限制，UI 5 层以上会很挤（依赖使用方自律）
