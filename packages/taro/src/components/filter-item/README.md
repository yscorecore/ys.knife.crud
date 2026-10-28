# FilterItem 系列（小程序版）

对齐 `@ys-knife-crud/element-plus` 的 `YsFilterItemLayout` + 四个具体 Item（Text / Date / DateRange / Enum），把 element-plus 里基于 `el-input`、`el-date-picker`、`el-select` 的实现换成小程序原生元素：

| 组件 | Element Plus 版 | 小程序版视图 |
| --- | --- | --- |
| `YsFilterItemLayout` | `YsFilterItemLayout`（div + 标签） | `view` + `text` |
| `YsTextFilterItem` | `el-input` | `input` |
| `YsDateFilterItem` | `el-date-picker type="date"` | `picker mode="date"` |
| `YsDateRangeFilterItem` | `el-date-picker type="daterange"` | 两个 `picker mode="date"` 拼「开始 至 结束」 |
| `YsEnumFilterItem` | `el-select`（单选）/ `el-select multiple` | 单选 `picker mode="selector"`，多选标签式选项 |

查询条件逻辑（`value` → `FilterInfo | null`）逐行对齐 `@ys-knife-crud/vue` 的同名 composable，但**内联**在本目录的 [use-filter-item.ts](file:///e:/ys.knife.crud/packages/taro/src/components/filter-item/use-filter-item.ts) 里，而不是依赖 `@ys-knife-crud/vue`——小程序包依赖越少越好。改逻辑时请与 vue 包同步。

## 引入

```ts
import {
  YsFilterItemLayout,
  YsTextFilterItem,
  YsDateFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
} from "@ys-knife-crud/taro";
```

## 基础用法

Item 必须放在 `YsFilterPanel`（或 `YsInfinitePage`）的 `filter-default` 插槽里，注册/反注册由 `YsFilterItemLayout` 通过 `useFilterPanelItem` 自动完成：

```vue
<script setup lang="ts">
import { Operator, fromArray, fromBool } from "@ys-knife-crud/core";
import { YsFilterPanel, YsTextFilterItem, YsDateRangeFilterItem, YsEnumFilterItem } from "@ys-knife-crud/taro";

const providers = fromArray(["甲供货商", "乙供货商"]);
const enabled = fromBool("启用", "禁用");
</script>

<template>
  <YsFilterPanel v-model="keyword" :text-filter-builder="kw => filter('name', Operator.Contains, con(kw))">
    <!-- 条件区：任意个 Item 自动参与聚合 -->
    <YsTextFilterItem label="姓名" property-path="name" :op="Operator.Contains" />
    <YsDateRangeFilterItem label="入职日期" property-path="joinDate" />
    <YsEnumFilterItem label="供货商" property-path="provider" :op="Operator.Equals" :options-source="providers" />
    <YsEnumFilterItem label="状态" property-path="enabled" :op="Operator.Equals" :options-source="enabled" multiple />
  </YsFilterPanel>
</template>
```

面板「查询」时会把**所有 Item 的 filter + 文本条件**按 AND 聚合成一个 `FilterInfo` emit 出来；某个 Item 未填值时它的 filter 为 `null`，聚合时自动跳过；全部为空时 emit `emptyFilter()`。

## 组件 Props

### YsFilterItemLayout

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | `string` | `""` | 控件上方的标签，空串不渲染 |
| api | `FilterItemApi` | (required) | Item 的 `{ filter, reset }`，layout 负责注册进面板 |

自定义 Item 时直接复用这个外壳：调自己的逻辑拿到 `{ value, filter, reset }`，组装 `api`（`filter` 用 getter 读 computed 的值），控件放默认插槽。

### YsTextFilterItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | `string` | `""` | 标签 |
| op | `Operator` | (required) | 常为 `Contains`，也可 `Equals` / `StartsWith` / `EndsWith` |
| propertyPath | `string` | (required) | 实体属性路径，即 `FilterInfo.left` |
| defaultValue | `string` | `undefined` | 初始值，缺省空串 |
| placeholder | `string` | `"请输入"` | 输入框占位文本 |

纯空白（含空串）视为未填，filter 为 `null`。

### YsDateFilterItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | `string` | `""` | 标签 |
| op | `Operator` | (required) | 常为 `Equals`，也可 `GreaterThan` / `LessThan` / `GreaterThanOrEqual` |
| propertyPath | `string` | (required) | 实体属性路径 |
| defaultValue | `string` | `undefined` | 初始值，`YYYY-MM-DD` |
| placeholder | `string` | `"选择日期"` | 未选时的占位文本 |
| start / end | `string` | `""` | 可选范围上下限（`YYYY-MM-DD`），透传给 picker，空串不限制 |

值为空串时 filter 为 `null`。小程序 picker 没有「取消已选」，所以值非空时右侧会多一个 `✕` 清除按钮。

### YsDateRangeFilterItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | `string` | `""` | 标签 |
| propertyPath | `string` | (required) | 实体属性路径 |
| defaultValue | `[string, string]` | `undefined` | 初始值 `[start, end]` |
| startPlaceholder | `string` | `"开始日期"` | 起始日期占位文本 |
| endPlaceholder | `string` | `"结束日期"` | 结束日期占位文本 |
| start / end | `string` | `""` | 可选范围上下限（`YYYY-MM-DD`） |

op 内部固定为 `Operator.Between`，不暴露 op prop。**两端都选满**才参与聚合，只选一端时 filter 为 `null`。值非空时同样有 `✕` 清除按钮。

### YsEnumFilterItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| label | `string` | `""` | 标签 |
| op | `Operator` | (required) | 仅单选模式使用，常为 `Equals` |
| propertyPath | `string` | (required) | 实体属性路径 |
| defaultValue | `string \| number \| null \| (string \| number)[]` | `undefined` | 初始值，单选用标量、多选用数组 |
| placeholder | `string` | `"请选择"` | 单选未选时的占位文本 |
| optionsSource | `EnumOptionsSource` | (required) | `() => Promise<EnumOption[]>`，`onMounted` 调用一次 |
| multiple | `boolean` | `false` | 多选模式用标签式选项渲染 |
| clearable | `boolean` | `true` | 单选模式是否显示清除按钮 |

- **单选**：使用声明方指定的 `op`
- **多选**：op 自动派生——0 项 → `null`，1 项 → `Equals`，2+ 项 → `In`
- 选项数据一律用 `core` 的 `fromOptions` / `fromObjectItems` / `fromArray` / `fromBool` 构造，`opt.label` 用于显示、`opt.value` 用于选中与 filter

## 注意事项

1. **注册只在 `YsFilterPanel` 上下文里生效**：`YsFilterItemLayout` 用 `inject(FilterPanelKey)` 注册，脱离面板单独渲染不会报错但也不会参与聚合。
2. **原生组件要在使用方登记**：`input` / `picker` 出现在预构建组件库里时，Taro 不会自动写进 `componentConfig.includes`，消费方页面模板里需要占位 `<input v-if="false" />`、`<picker v-if="false" />`。
3. **`api.filter` 必须是 getter**：面板端的聚合是 computed，直接传 `filterInfo.value` 会丢掉响应性，Item 值变了面板也不知道。
4. **「重置」会调用每个 Item 的 `reset()`**：恢复成 `defaultValue`，不是一律清空。
5. **多选模式的 op 不可控**：`multiple` 为 true 时声明方的 `op` 被忽略（1 项 `Equals`、2+ 项 `In`），要固定某个 op 请用单选模式自行 `filter()`。
6. **日期值一律是字符串 `YYYY-MM-DD`**：组件不接收 `Date` 对象，与 element-plus 版的 `value-format` 语义对齐。
