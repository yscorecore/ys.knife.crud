# YsFilterPanel 筛选面板（小程序版）

参照 `@ys-knife-crud/element-plus` 的 `YsFilterPanel`，为小程序（Taro + Vue3）精简适配的筛选面板。

- 顶部一行：文本搜索框 +「查询」「重置」按钮（默认右对齐）；左侧「筛选」按钮用于展开/折叠下方条件区
- **「筛选」按钮与条件区只在默认插槽提供了自定义搜索项时才渲染**，否则只显示搜索框与按钮
- 条件区由默认插槽承载（下拉选择、日期区间等业务条件），收起时仅隐藏（`v-show`），插槽内控件保持挂载、状态不丢失
- 点「查询」时按 **AND** 聚合条件，最终构造一个 `FilterInfo` 对象派发 `search` 事件
- 文本搜索的 `FilterInfo` 构造完全由 `textFilterBuilder` 委托——最基础的 contains/equals 到 OR 多属性匹配都走同一条入口，不再单独暴露 `searchPropertyPath` / `searchOp`
- 文本框的值只在组件内部维护（不提供 `v-model`）：输入即写入内部状态，点「重置」时清空；需要读取当前值可经 expose 的 `keyword`
- 只使用小程序内置元素（`view` / `text` / `input`），不使用 `div`

## 引入

```ts
import { YsFilterPanel, useFilterPanelItem } from "@ys-knife-crud/taro";
```

组件样式随包内的 `dist/index.css` 一起引入（构建时会自动带上），类名统一使用 `.yk-filter-panel*` 前缀。

## 基础用法（单属性 contains）

```vue
<script setup lang="ts">
import { YsFilterPanel } from "@ys-knife-crud/taro";
import { Operator, con, filter } from "@ys-knife-crud/core";
import type { FilterInfo } from "@ys-knife-crud/core";

/** 最简单的单属性 contains：等价于旧版 search-property-path + search-op */
function buildTextFilter(kw: string): FilterInfo {
  return filter("name", Operator.Contains, con(kw)) as unknown as FilterInfo;
}

function onSearch(filter: FilterInfo): void {
  console.log(filter.toString()); // 如：name contains "张"
}
</script>

<template>
  <!-- 只有搜索框 + 查询/重置，不显示「筛选」按钮（插槽为空） -->
  <YsFilterPanel
    placeholder="请输入姓名"
    :text-filter-builder="buildTextFilter"
    @search="onSearch"
  />
</template>
```

## 进阶用法（一个输入框匹配多个属性）

委托的签名是 `(kw: string) => FilterInfo | null`，返回什么全由你决定——包括 OR 语义：

```vue
<script setup lang="ts">
import { YsFilterPanel } from "@ys-knife-crud/taro";
import { FilterInfo, Operator, con, filter } from "@ys-knife-crud/core";

/** 输入框同时匹配「名称」或「编码」任一包含——最终语义是 OR */
function buildTextFilter(kw: string): FilterInfo {
  return FilterInfo.createOr(
    filter("name", Operator.Contains, con(kw)),
    filter("code", Operator.Contains, con(kw)),
  ) as unknown as FilterInfo;
}
</script>

<template>
  <YsFilterPanel
    placeholder="请输入名称或编码"
    :text-filter-builder="buildTextFilter"
  />
</template>
```

委托返回 `null` / `undefined` 时，这一项不参与聚合（等价于输入为空）。未传委托时，搜索框只作为 UI 占位，不会产生 FilterInfo——插槽里的自定义搜索项不受影响。

## 自定义搜索项（外部组件注册 FilterInfo）

插槽里只要放了内容，「筛选」按钮就会出现。自定义搜索项组件通过 `useFilterPanelItem` 把自身 `FilterInfo` 注册进面板，点「查询」时与文本搜索条件按 AND 聚合，点「重置」时面板会调用它的 `reset()`。

```vue
<!-- src/components/provider-filter.vue -->
<script setup lang="ts">
import { computed } from "vue";
import { Operator, con, filter } from "@ys-knife-crud/core";
import type { FilterInfo } from "@ys-knife-crud/core";
import { useFilterPanelItem } from "@ys-knife-crud/taro";

const props = defineProps<{ modelValue: number; options: string[] }>();
const emit = defineEmits<{ (e: "update:modelValue", value: number): void }>();

/** 下标 0 视为「全部」，不参与条件聚合 */
const filterInfo = computed<FilterInfo | null>(() =>
  props.modelValue <= 0
    ? null
    : (filter("provider", Operator.Equals, con(props.options[props.modelValue])) as unknown as FilterInfo),
);

useFilterPanelItem({
  // 用 getter 读 computed，面板聚合才能追踪到本项变化
  get filter() {
    return filterInfo.value;
  },
  reset() {
    emit("update:modelValue", 0);
  },
});

function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string | number } }).detail;
  emit("update:modelValue", Number(detail?.value ?? 0));
}
</script>

<template>
  <picker mode="selector" :range="options" :value="modelValue" @change="onChange">
    <view class="provider-picker">{{ options[modelValue] }}▾</view>
  </picker>
</template>
```

使用：

```vue
<YsFilterPanel
  placeholder="请输入姓名"
  :text-filter-builder="kw => filter('name', Operator.Contains, con(kw))"
  @search="onSearch"
  @reset="onReset"
>
  <ProviderFilter v-model="providerIndex" :options="PROVIDERS" />
</YsFilterPanel>
```

完整可运行示例见 `packages/taro-demo/src/pages/index/index.vue` + `packages/taro-demo/src/components/provider-filter.vue`。

## YsRootFilterPanel（无 UI 的聚合容器）

面板的条件注册与 AND 聚合并不在 `YsFilterPanel` 里，而是下沉到 `YsRootFilterPanel`——它**不渲染任何视觉元素**（模板只有 `<slot />`，不额外包节点，因此也不会改变布局）：

1. 提供注册通道：`provide(FilterPanelKey, register)`，插槽内的自定义搜索项经 `useFilterPanelItem` 自动注册/注销
2. 聚合条件：`extraFilter` + 所有已注册子项按 AND 合并，全空返回 `emptyFilter()`

`YsFilterPanel` 只是它的一个 UI 外壳（工具栏 + 文本搜索框 + 展开/折叠）。需要自己的面板外框时直接用它：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YsRootFilterPanel } from "@ys-knife-crud/taro";

const rootRef = ref();

function onQuery(): void {
  const filter = rootRef.value?.filter;   // 聚合后的 FilterInfo
  // 调用自己的查询逻辑
}
</script>

<template>
  <!-- 自定义外框 -->
  <view class="my-panel">
    <YsRootFilterPanel ref="rootRef">
      <ProviderFilter v-model="providerIndex" :options="PROVIDERS" />
      <YsDateRangeFilterItem ... />
    </YsRootFilterPanel>
    <view @tap="onQuery">查询</view>
  </view>
</template>
```

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| extraFilter | `FilterInfo \| null` | `null` | 外部追加条件，与所有子项条件按 AND 合并（如文本搜索）；为空传 `null` |

| Expose | 说明 |
| --- | --- |
| filter | 聚合后的 `FilterInfo`（`extraFilter` AND 全部子项）；无任何条件时为 `emptyFilter()` |
| reset() | 遍历已注册子项各自 `reset()`（不负责清空 `extraFilter`，由外部自行维护） |

## 条件聚合规则

点「查询」时，面板会按以下顺序收集所有非空条件，再用 `FilterInfo.createAnd(...)` 合成最终结果（聚合逻辑位于内部的 `YsRootFilterPanel`）：

1. 文本搜索条件（`textFilter` computed）：输入 trim 后为空或没传 `textFilterBuilder` → 跳过；否则取委托返回值（null/undefined 也视为跳过）。该条件作为 `extraFilter` 传给 root
2. 默认插槽内所有经 `useFilterPanelItem` 注册的子项（取各自的 `.filter` getter，null 跳过）

全部为空 → 返回 `emptyFilter()`（单例，`FilterInfo.equals(emptyFilter(), filterInfo)` 为 true）。

## API

### Props

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| placeholder | 文本搜索框占位文案 | `string` | `"请输入"` |
| filterText | 展开/折叠触发器文案 | `string` | `"筛选"` |
| searchButtonText | 查询按钮文案 | `string` | `"查询"` |
| resetButtonText | 重置按钮文案 | `string` | `"重置"` |
| defaultExpanded | 条件区初始是否展开 | `boolean` | `false` |
| showSearch | 是否渲染「查询」按钮 | `boolean` | `true` |
| showReset | 是否渲染「重置」按钮 | `boolean` | `true` |
| textFilterBuilder | **唯一的**文本搜索条件构造入口；入参是输入框当前值（已 trim），返回应产出的 `FilterInfo`；返回 null/undefined 则跳过；未传则文本搜索框仅作 UI 占位 | `(keyword: string) => FilterInfo \| null` | `undefined` |
| customClass | 追加到根节点的类名（外部自定义样式入口） | `string` | `""` |
| customStyle | 追加到根节点的内联样式 | `string` | `""` |

### Events

| 事件 | 说明 | 回调参数 |
| --- | --- | --- |
| search | 点击「查询」或在输入框确认（键盘回车） | `(filter: FilterInfo)` 聚合后的完整条件；无任何条件时为 `emptyFilter()` |
| reset | 点击「重置」：文本已清空、已注册子项已重置 | — |
| expand-change | 条件区展开/折叠状态变化 | `(expanded: boolean)` |

### Expose

| 方法/属性 | 说明 |
| --- | --- |
| keyword | 文本搜索框当前值（`Ref<string>`，供读取，外部不写入） |
| filter | 当前聚合后的 `FilterInfo`（`ComputedRef<FilterInfo>`） |
| expanded | 条件区当前是否展开（`Ref<boolean>`） |
| toggle() | 切换条件区展开/折叠 |
| reset() | 清空文本 + 重置已注册子项 + 派发 `reset` |

### Slots

| 插槽 | 说明 |
| --- | --- |
| default | 自定义搜索项，纵向排列（`gap: 16rpx`），收起时隐藏但保持挂载；有内容才会渲染「筛选」按钮与条件区 |

### 配套导出

| 导出 | 说明 |
| --- | --- |
| `YsRootFilterPanel` | 无 UI 的注册与聚合容器，`YsFilterPanel` 基于它实现；自定义面板外框时使用 |
| `useFilterPanelItem(api)` | 在自定义搜索项组件中调用，把 `{ filter, reset }` 注册到最近的 YsFilterPanel / YsRootFilterPanel |
| `FilterPanelKey` | 面板注入键（`InjectionKey<RegisterFilterItem>`），需要手动 `inject` 时使用 |

## 样式类

| 类名 | 说明 |
| --- | --- |
| `.yk-filter-panel` | 面板容器，白底 `border-radius: 12rpx` |
| `.yk-filter-panel__bar` | 顶部操作栏（`flex`） |
| `.yk-filter-panel__trigger` / `__trigger-text` / `__arrow` | 展开/折叠触发器、文案、箭头 |
| `.yk-filter-panel__field` | 输入框容器，撑开中间剩余空间，浅灰底圆角 |
| `.yk-filter-panel__input` / `__placeholder` | 输入框本体、占位文案 |
| `.yk-filter-panel__actions` / `__btn` | 按钮组（`margin-left: auto` 右对齐）、按钮基类 |
| `.yk-filter-panel__btn--primary` | 查询按钮（主色实心） |
| `.yk-filter-panel__btn--default` | 重置按钮（浅灰底） |
| `.yk-filter-panel__conditions` | 条件区容器（顶部分隔线 + 内边距） |

外部自定义样式有两种方式：传 `custom-class` / `custom-style`，或直接在自己的样式文件里用上述类名覆盖（同名类选择器按顺序覆盖）。

## 注意事项

1. **「筛选」按钮显隐**：由默认插槽是否有内容决定（`slots.default` 存在即显示）；没有自定义条件时不要传空插槽。
2. **注册项的 `filter` 必须是 getter**：`useFilterPanelItem` 传入的对象里用 `get filter()` 读 `computed`，root 的聚合 `computed` 才能追踪变化；直接传 `filter: computed.value` 会失去响应性。
3. **不要给 `input` 直接加 `flex:1` 当 flex 子项**：小程序端会塌陷成极小宽度（placeholder 不可见、输入无回显）。组件内已用 `.yk-filter-panel__field`（普通块容器，`flex:1`）撑开，input 自身只用 `width:100%`。
4. **`input` 事件取值方式**：小程序 `event.detail.value` 与 DOM `InputEvent` 类型冲突，组件以 `Event` 接收后按 `(e as { detail?: { value?: string } }).detail?.value` 读取，业务侧无需处理。
5. **只允许小程序原生标签**：`view` / `text` / `input` / `picker` / `scroll-view` 等，禁止 `div`。
6. **样式非 scoped**：小程序端 scoped 支持有限，靠 `.yk-` 前缀防泄漏；自定义条件建议同样使用带前缀的类名。
7. **重置语义**：面板会清空文本并让 root 调用所有已注册子项的 `reset()`，但插槽内没有注册的控件需由使用方在 `@reset` 中自行复位。
8. **文本值不对外双向绑定**：搜索框内容由组件内部维护，没有 `modelValue` prop 与 `update:modelValue` 事件；查询结果只经 `search` 事件的 `FilterInfo` 体现，需要读取当前输入时用 `filterPanel.keyword` 或 `textFilterBuilder` 的入参。
9. **使用方要在自己的页面模板里登记一次 `input`**：Taro 只为「应用源码模板中出现过的原生组件」生成 WXML 模板，组件库产物里的 `<input>` 不会被扫描登记。若页面此前没有用过 `input`，搜索框会不渲染（placeholder 也看不到）。解决办法是在页面模板里放一个占位：`<input v-if="false" />`。
10. **`textFilterBuilder` 的返回值会直接进 AND 聚合**：builder 里可以用 `FilterInfo.createOr` 做 OR 语义，面板不会改写它——最终 AND 聚合时一个分支里嵌着 OR 是完全合法的 FilterInfo 结构。
11. **委托签名返回 `FilterInfo` 可能不满足严格类型检查**：`ys.knife.query.js` 包产出的对象是具体类实例，跨包类型比对时有时需要 `as unknown as FilterInfo` 兜底（上面示例都有）。这是 `@ys-knife-crud/core` 与 `ys.knife.query.js` 两个包之间的结构性比较问题，小程序端和 web 版同样受影响。

## 与 element-plus 版的差异

| 能力 | element-plus 版 | 小程序版 |
| --- | --- | --- |
| 基础结构（触发/搜索/查询/重置/条件区） | ✅ | ✅ |
| `search` 派发聚合 `FilterInfo` | ✅ | ✅ |
| 条件项注册（`provide` + 子项 expose） | ✅（`YsFilterItem` / 内置 `YsTextFilterItem` / `YsDateFilterItem` 等） | ✅（`useFilterPanelItem`，无内置 item 组件） |
| 条件区按「有无自定义搜索项」自动显隐 | ❌ | ✅ |
| 查询/重置右对齐 + `customClass`/`customStyle` | ❌ | ✅ |
| 文本条件自定义入口 | 内置 `YsTextFilterItem` 单独组件 | `textFilterBuilder` prop（**唯一入口**，已移除 `searchPropertyPath` / `searchOp`） |
| 高级筛选 / 单行模式 / 快捷查询（`quickQueries`） | ✅ | ❌ 未移植（暂不需要） |
