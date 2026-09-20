# 查询条件控件 + 搜索面板 实现计划

## Context

`packages/core/src/ui.ts#L186-202` 已声明 `FilterItemProps / FilterItemApi / FilterPanelProps / FilterPanelApi` 四个空契约，但目前只有 core 层占位，没有任何 vue/element-plus 实现。用户希望基于这两个契约实现查询条件控件，最终在搜索面板上聚合出一个大的 `FilterInfo`，供后端查询使用。

### 本期范围（缩减后）

**只实现字符串（string）一种 FilterItem**，先验证整套机制：core 契约 → vue composable → element-plus 组件 → provide/inject 收集 → FilterInfo 聚合 → 搜索/重置按钮 → demo 演示。其他 3 种类型（date/number/bool）作为后续追加，契约层 `FilterItemType` 与 `type` 字段提前保留，方便后续扩展不动 core 契约。

### 用户已确认的设计决策

1. **组合方式**：插槽组合（`<ys-filter-item>`），用 provide/inject 让 FilterPanel 收集子 FilterItem
2. **按钮与事件**：FilterPanel 内置「搜索」「重置」按钮；搜索时 `emit('search', FilterInfo)`、重置时清空所有 item 并 `emit('reset')`
3. **op 切换**：固定 op（声明时指定，字符串默认 Contains）
4. **op 选项**：字符串 FilterItem 支持声明方传任意 `Operator`（Contains/Equals/StartsWith/EndsWith 等），但 UI 只渲染一个 el-input（无 op 下拉切换）

### 关键依赖类型核查（已读 `packages/core/node_modules/ys.knife.query.js/dist/filter.d.ts`）

- `Operator` 16 个枚举成员，字符串 enum（运行时为 string）
- `ValueType` 包含 `string | number | boolean | bigint | null | (string|null)[] | (number|null)[]` —— **数组是合法 value**，可直接作为 `Between` 右值
- `FilterInfo.isEmpty()` 仅当 `combinType == SingleItem && op == null` 时为 true —— `createAnd(...)` 即使空数组也返回非空，所以 panel 端必须先 `.filter(f => !f.isEmpty())` 再聚合，**全空时直接返回 `emptyFilter()`**
- `filter(left, op, right)` 工厂函数接受字符串路径 + 值（含数组），是单条件构造的最简洁入口
- `emptyFilter<T>()` 返回 `op=null, combinType=SingleItem`，是「无条件」的标准占位

---

## 文件清单

### 新建

| 路径 | 职责 |
|---|---|
| `packages/vue/src/filter/filterPanel.ts` | `useFilterPanel` composable + `FilterPanelKey: InjectionKey<FilterItemRegisterFn>` |
| `packages/vue/src/filter/filterItem.ts` | `useFilterItem` composable（本期只实现 string 分支，date/number/bool 留 TODO 抛 unsupported） |
| `packages/element-plus/src/filter/filterPanel.vue` | YsFilterPanel：provide register + 默认插槽 + 内置按钮 + emit search/reset + defineExpose FilterPanelApi |
| `packages/element-plus/src/filter/filterItem.vue` | YsFilterItem：本期只实现 `type === 'string'` 渲染 el-input 分支，其他类型渲染占位提示「未实现：{type}」；inject register + 注册/反注册 + defineExpose FilterItemApi |
| `packages/element-plus-demo/src/pages/filter/demoData.ts` | demo 本地数据：30 行含 `name` 字段（可再加 age 等，但 demo 只演示字符串过滤） |
| `packages/element-plus-demo/src/pages/filter/FilterPanelPage.vue` | 演示页：1 个字符串 FilterItem + el-table 展示前端 mock 过滤结果 + 显示 `filter.toString()` |

### 修改

| 路径 | 修改点 |
|---|---|
| `packages/core/src/ui.ts` | 完善 FilterItemProps（加 `type`、`placeholder`）、FilterPanelProps（加 `showSearch`/`showReset`/`searchButtonText`/`resetButtonText`）、FilterItemApi（加 `value`）、FilterPanelApi（加 `items`） |
| `packages/vue/src/index.ts` | 追加 `export * from "./filter/filterPanel"; export * from "./filter/filterItem";` |
| `packages/element-plus/src/index.ts` | 导入 + 导出 YsFilterPanel/YsFilterItem + plugin `app.component` 全局注册 + 导出 `YsFilterPanelProps`/`YsFilterItemProps` 实例类型 |
| `packages/element-plus-demo/src/demoPages.ts` | 在 demoPages 数组追加 `{ id: "filter-panel", label: "查询条件面板（FilterPanel + 字符串 FilterItem）", component: FilterPanelPage }` |

---

## 契约草案（`packages/core/src/ui.ts` 最终形态）

```ts
/** FilterItem 支持的值类型，决定渲染哪个 el 控件 */
export type FilterItemType = "string" | "date" | "number" | "bool";

export interface FilterItemProps {
    /** 显示标签（渲染在控件左侧） */
    readonly label: string;
    /** 运算符；本期 string 类型默认 Contains，但声明方可显式传任意 Operator（Equals/StartsWith 等） */
    readonly op: Operator;
    /** 实体属性路径（FilterInfo.left），如 "name" / "user.age" */
    readonly propertyPath: string;
    /** 控件类型，决定渲染哪个 el 组件；本期实现 string，其他类型待后续追加 */
    readonly type: FilterItemType;
    /** 初始值；string 为单值字符串 */
    readonly defaultValue?: unknown;
    /** 可选占位文本 */
    readonly placeholder?: string;
}

export interface FilterItemApi {
    /** 当前值构造出的 FilterInfo；值为空时返回 emptyFilter() */
    readonly filter: FilterInfo;
    /** 当前控件值（date 为 [start,end]，其余为单值）；供外部（含 demo）读取做客户端过滤 */
    readonly value: unknown;
    reset(): void;
}

export interface FilterPanelProps {
    /** 是否渲染内置「搜索」按钮，默认 true。false 时外部自实现按钮经 ref 取 filter 触发 */
    readonly showSearch?: boolean;
    /** 是否渲染内置「重置」按钮，默认 true */
    readonly showReset?: boolean;
    /** 搜索按钮文案，默认 "搜索" */
    readonly searchButtonText?: string;
    /** 重置按钮文案，默认 "重置" */
    readonly resetButtonText?: string;
}

export interface FilterPanelApi {
    /** 聚合所有已注册 FilterItem 的 FilterInfo；全部为空时返回 emptyFilter() */
    readonly filter: FilterInfo;
    /** 已注册的 item api 列表（响应式；demo/调试用） */
    readonly items: readonly FilterItemApi[];
    reset(): void;
}
```

### 契约设计要点

- `op` 保留为 `Operator`（必填，声明方显式指定）。比「按 type 推断默认」更简单且 TS 无联合复杂度。
- `type` 必填，是 FilterItem 分发控件的唯一依据。
- FilterPanelProps 全可选，默认行为下「开箱即用」渲染两个内置按钮，对齐 `showXxx` 现有模式（`showCheckbox`/`showCustomConfig`/`showExportExcel`）。
- `FilterItemApi.value` + `FilterPanelApi.items` 是新增的便利字段，让 demo 能直接遍历 item 做前端过滤，无需反射 `FilterInfo.toString()` 的 protected 字段。

---

## vue 层 composable 设计

### `packages/vue/src/filter/filterPanel.ts`

```ts
import { computed, ref, type InjectionKey } from "vue";
import { type FilterInfo, emptyFilter } from "ys.knife.query.js";
import type { FilterItemApi, FilterPanelApi } from "@ys.knife.crud/core";

/** FilterItem 向 Panel 注册自己用的函数签名；返回反注册函数 */
export type FilterItemRegisterFn = (api: FilterItemApi) => () => void;

/** provide/inject token：Panel provide 一个 register 函数，Item inject 它 */
export const FilterPanelKey: InjectionKey<FilterItemRegisterFn> = Symbol("YsFilterPanel");

export function useFilterPanel() {
  /** 响应式 Map；增删后整体替换触发 track（同 useSelection 的 selectedMap 范式） */
  const items = ref(new Map<string, FilterItemApi>());
  let counter = 0;

  const register: FilterItemRegisterFn = (api) => {
    const key = String(++counter);
    items.value.set(key, api);
    items.value = new Map(items.value);
    return () => {
      items.value.delete(key);
      items.value = new Map(items.value);
    };
  };

  /** 聚合 filter：先过滤空条件再 createAnd；全空时 emptyFilter() */
  const filter = computed<FilterInfo>(() => {
    const all = [...items.value.values()].map((a) => a.filter);
    const nonEmpty = all.filter((f) => !f.isEmpty());
    return nonEmpty.length === 0 ? emptyFilter() : FilterInfo.createAnd(...nonEmpty);
  });

  /** items 列表（响应式；demo 用） */
  const itemsList = computed<readonly FilterItemApi[]>(() => [...items.value.values()]);

  function reset(): void {
    for (const api of items.value.values()) api.reset();
  }

  return { filter, items: itemsList, register, reset };
}
```

**响应式链路验证**：panel `filter` computed 迭代 Map 时调 `a.filter`（getter）→ getter 内读 `filterInfo.value`（computed）→ 读 `value.value`（ref）→ 所有层级被 track。item 值变化时 panel filter 自动重算。同模式已在 `useSelection` 的 `selectedRows` 验证。

### `packages/vue/src/filter/filterItem.ts`

```ts
import { computed, ref } from "vue";
import { type FilterInfo, Operator, filter, emptyFilter } from "ys.knife.query.js";
import type { FilterItemApi, FilterItemProps } from "@ys.knife.crud/core";

function isEmptyValue(type: FilterItemProps["type"], v: unknown): boolean {
  switch (type) {
    case "string": return v == null || (typeof v === "string" && v.trim() === "");
    // 后续追加：
    case "number": throw new Error(`FilterItem type "${type}" 尚未实现`);
    case "date":   throw new Error(`FilterItem type "${type}" 尚未实现`);
    case "bool":   throw new Error(`FilterItem type "${type}" 尚未实现`);
  }
}

function initialByType(type: FilterItemProps["type"]): unknown {
  switch (type) {
    case "string": return "";
    // 后续追加：
    case "number": throw new Error(`FilterItem type "${type}" 尚未实现`);
    case "date":   throw new Error(`FilterItem type "${type}" 尚未实现`);
    case "bool":   throw new Error(`FilterItem type "${type}" 尚未实现`);
  }
}

export function useFilterItem(props: Pick<FilterItemProps, "type" | "op" | "propertyPath" | "defaultValue">) {
  const value = ref<unknown>(props.defaultValue ?? initialByType(props.type));

  const filterInfo = computed<FilterInfo>(() => {
    if (isEmptyValue(props.type, value.value)) return emptyFilter();
    // 本期 string：value 是字符串，直接作为右值
    return filter(props.propertyPath, props.op, value.value as any);
  });

  function reset(): void {
    value.value = props.defaultValue ?? initialByType(props.type);
  }

  return { value, filter: filterInfo, reset };
}
```

---

## element-plus 层组件设计

### `packages/element-plus/src/filter/filterPanel.vue`

```vue
<script setup lang="ts">
import { provide } from "vue";
import type { FilterInfo, FilterPanelApi } from "@ys.knife.crud/core";
import { FilterPanelKey, useFilterPanel } from "@ys.knife.crud/vue";

defineOptions({ name: "YsFilterPanel" });

// 运行时 props 声明（不用 defineProps<泛型>，跨包类型解析会丢字段，参考 table.vue#L33-88）
const props = defineProps({
  showSearch:       { type: Boolean, default: true },
  showReset:        { type: Boolean, default: true },
  searchButtonText: { type: String, default: "搜索" },
  resetButtonText:  { type: String, default: "重置" },
});

const emit = defineEmits<{
  (e: "search", filter: FilterInfo): void;
  (e: "reset"): void;
}>();

const { filter, items, register, reset } = useFilterPanel();
provide(FilterPanelKey, register);

function onSearch() { emit("search", filter.value); }
function onReset()  { reset(); emit("reset"); }

defineExpose({ filter, items, reset } satisfies FilterPanelApi);
</script>

<template>
  <div class="yk-filter-panel">
    <div class="yk-filter-panel__items"><slot /></div>
    <div v-if="showSearch || showReset" class="yk-filter-panel__actions">
      <el-button v-if="showReset"  @click="onReset">{{ resetButtonText }}</el-button>
      <el-button v-if="showSearch" type="primary" @click="onSearch">{{ searchButtonText }}</el-button>
    </div>
  </div>
</template>
```

### `packages/element-plus/src/filter/filterItem.vue`

```vue
<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, type PropType } from "vue";
import type { FilterItemApi, FilterItemType } from "@ys.knife.crud/core";
import { Operator } from "ys.knife.query.js";
import { FilterPanelKey, useFilterItem } from "@ys.knife.crud/vue";

defineOptions({ name: "YsFilterItem" });

const props = defineProps({
  label:        { type: String, required: true },
  // Operator 是字符串 enum，运行时为 string，用 String as PropType<Operator>
  op:           { type: String as PropType<Operator>, required: true },
  propertyPath: { type: String, required: true },
  // FilterItemType 是字符串联合，同上
  type:         { type: String as PropType<FilterItemType>, required: true },
  // 多类型 defaultValue 用 Array 构造器容纳 string/number/boolean/数组
  defaultValue: { type: [String, Number, Boolean, Array] as PropType<unknown>, required: false },
  placeholder:  { type: String, required: false },
});

const { value, filter: filterInfo, reset } = useFilterItem(props);

// 组装稳定 API 对象：filter/value 是 getter，每次调用读最新 computed.value
const api: FilterItemApi = {
  get filter() { return filterInfo.value; },
  get value() { return value.value; },
  reset,
};

// inject 拿 panel 的 register；未在 panel 内使用时静默退化（仍可独立 expose）
const register = inject(FilterPanelKey, null);
let unregister: (() => void) | null = null;
onMounted(() => { if (register) unregister = register(api); });
onBeforeUnmount(() => { unregister?.(); });

defineExpose(api);
</script>

<template>
  <div class="yk-filter-item">
    <label class="yk-filter-item__label">{{ label }}</label>
    <div class="yk-filter-item__control">
      <!-- 本期只实现 string -->
      <el-input v-if="type === 'string'" v-model="value" :placeholder="placeholder" clearable />
      <!-- 其他类型占位提示，后续追加 -->
      <span v-else class="yk-filter-item__todo">未实现：{{ type }}</span>
    </div>
  </div>
</template>
```

**关键点**：
- `op` 用 `String as PropType<Operator>`，`type` 用 `String as PropType<FilterItemType>`：字符串 enum/联合 跨包类型解析丢字段问题，参考 `table.vue#L80` 对 `viewMode` 的处理范式
- `defaultValue` 用 `[String, Number, Boolean, Array]` 多类型构造器（为后续扩展类型预留）

### `packages/element-plus/src/index.ts` 修改

```ts
import YsTable from "./table/table.vue";
import YsMainPanel from "./mainPanel/mainPanel.vue";
import YsFilterPanel from "./filter/filterPanel.vue";
import YsFilterItem from "./filter/filterItem.vue";

export { YsTable, YsMainPanel, YsFilterPanel, YsFilterItem };
export type YsTableProps = InstanceType<typeof YsTable>["$props"];
export type YsMainPanelProps = InstanceType<typeof YsMainPanel>["$props"];
export type YsFilterPanelProps = InstanceType<typeof YsFilterPanel>["$props"];
export type YsFilterItemProps = InstanceType<typeof YsFilterItem>["$props"];

const YsCrudElementPlus: Plugin = {
  install(app: App) {
    app.component("YsTable", YsTable);
    app.component("YsMainPanel", YsMainPanel);
    app.component("YsFilterPanel", YsFilterPanel);
    app.component("YsFilterItem", YsFilterItem);
  },
};
```

---

## demo 演示页设计

### `packages/element-plus-demo/src/pages/filter/demoData.ts`

新建本地数据集，30 行 `FilterRow`：`id/name/age` 等。本期只演示字符串过滤，但数据集保留扩展余地。

### `pages/filter/FilterPanelPage.vue`

```vue
<ys-filter-panel ref="panelRef" @search="onSearch" @reset="onReset">
  <!-- 本期只演示字符串 contains 过滤 -->
  <ys-filter-item label="姓名" type="string" property-path="name" :op="Operator.Contains" placeholder="输入姓名片段" />
</ys-filter-panel>

<!-- 显示当前 filter.toString() 便于观察 -->
<p>当前 FilterInfo: <code>{{ panelRef?.filter?.toString() }}</code></p>

<!-- 前端 mock 过滤：遍历 panelRef.items 读取 item.value 做 contains 客户端过滤 -->
<el-table :data="filteredRows" border>
  <el-table-column prop="id" label="ID" width="60" />
  <el-table-column prop="name" label="姓名" />
  <el-table-column prop="age" label="年龄" width="80" />
</el-table>
```

前端过滤函数：遍历 `panelRef.value.items`（响应式），对每个 item 按 `propertyPath + op + value` 应用过滤。本期只处理 string contains（`name.includes(value)`）。

demo 页面统一 `emit('back')` 返回导航（参考 demoPages.ts 的 DemoPageDef 约定）。

### `demoPages.ts` 修改

追加：
```ts
import FilterPanelPage from "./pages/filter/FilterPanelPage.vue";
// ...
{ id: "filter-panel", label: "查询条件面板（FilterPanel + 4 种 FilterItem）", component: FilterPanelPage },
```

---

## 关键技术点

| 点 | 处理 |
|---|---|
| 值为空时 filter | `useFilterItem.filterInfo` 返回 `emptyFilter()`（op=null, isEmpty=true） |
| 全部 item 均空时 panel filter | `useFilterPanel.filter` 返回 `emptyFilter()`（先 `.filter(f => !f.isEmpty())` 再 createAnd） |
| Map 响应式 | 增删后 `items.value = new Map(items.value)` 整体替换触发 track（与 useSelection 的 selectedMap 一致） |
| FilterItem 在 v-if 内使用 | onMounted/onBeforeUnmount 配对调 register/unregister，v-if 卸载时自动从 panel Map 移除，filter computed 重算 |
| op 跨包类型解析 | 用运行时 `defineProps({ op: String as PropType<Operator> })`，不用泛型语法 |
| FilterPanel + FilterItem 都自管 | 一旦挂载即注册到 panel；panel 自管 items Map + filter computed + reset；item 自管 value + filterInfo computed + reset |
| 其他类型 (date/number/bool) | 本期 useFilterItem 与 FilterItem.vue 内对应分支 throw/渲染占位；后续追加时只动这两处 + 4 个 case 实现，不动 core 契约 |

---

## 实现顺序

1. **core 契约**：改 `ui.ts` 加 `FilterItemType` + 补全 4 个接口字段（含 `value`/`items`）
2. **vue composables**：新建 `filter/filterPanel.ts` + `filter/filterItem.ts`；更新 `vue/src/index.ts` barrel 导出
3. **build vue + core**：`pnpm --filter @ys.knife.crud/vue build` + `pnpm --filter @ys.knife.crud/core build`（element-plus 依赖其 dist）
4. **element-plus 组件**：新建 `filter/filterPanel.vue` + `filter/filterItem.vue`；更新 `element-plus/src/index.ts` 导出 + plugin 注册
5. **build element-plus**：`pnpm --filter @ys.knife.crud/element-plus build`
6. **demo**：新建 `pages/filter/demoData.ts` + `pages/filter/FilterPanelPage.vue`；更新 `demoPages.ts`
7. **typecheck + dev 验证**：`pnpm --filter @ys.knife.crud/element-plus-demo typecheck` + `pnpm dev` 打开新 demo 页测试

---

## 验证步骤

`pnpm dev`（启动 `localhost:5173`）→ 打开「查询条件面板」demo：

1. **初始态**：1 个字符串 FilterItem 显示默认空值，FilterInfo 显示为空（`emptyFilter().toString()` 应为空串）
2. **输入姓名片段**：FilterInfo 更新为 `name contains xxx`，el-table 前端过滤
3. **清空输入**：FilterInfo 回到 `emptyFilter()`，表格恢复全量
4. **点重置**：item 值清空，表格恢复全量
5. **点搜索**：emit('search', FilterInfo) 被父组件接收，表格按当前 filter 过滤
6. **可选：v-if 卸载 item**：从 panel Map 移除，FilterInfo 自动剔除该项

---

## 风险与对策

| 风险 | 对策 |
|---|---|
| op 跨包类型丢字段 | 用运行时 `String as PropType<Operator>`，不用泛型语法 |
| Map 直接 `.set()` 不触发 computed | 每次增删后整体替换 `items.value = new Map(items.value)` |
| `api.filter` getter 在 panel computed 内是否 track item value | 能。getter 内读 `filterInfo.value` → 读 `value.value`，响应式穿透。已在 `useSelection` 验证 |
| build dist 滞后 | 严格按实现顺序第 3、5 步 build，demo 才能消费到新类型与组件 |
| 其他类型分支调用 throw 导致运行时崩 | demo 只用 string；FilterItem.vue 已用 `v-if/v-else` 渲染占位提示，不会进入 throw 分支 |
