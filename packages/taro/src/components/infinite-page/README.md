# YsInfinitePage 三合一页面骨架（小程序版）

把 `YsFilterPanel`（顶部）+ `YsInfiniteList`（中间撑满）+ `YsCommandBar`（底部）组合成一个固定三段式 flex 布局，省去业务页面每次手搓三段容器 + 各自写一遍 props 透传。

```
┌──────────────────────────────┐
│  YsFilterPanel                │ ← flex-shrink: 0，高度自适应
├──────────────────────────────┤
│                              │
│  YsInfiniteList               │ ← flex: 1 + min-height: 0
│                              │     中间撑满，scroll-view 滚
├──────────────────────────────┤
│  YsCommandBar                 │ ← flex-shrink: 0，高度自适应
└──────────────────────────────┘
```

- 整个面板 `height: 100vh`，外部不需要再包一层 page
- CommandBar 是空壳子（只有按钮 + 插槽，不持状态），业务侧的 `TableAction.execute()` 通过闭包抓 `pageRef.list`
- InfinitePage 本身不做任何自动联调（不会把 search 事件 reload 自动串起来），所有事件原样转发，业务侧自己接

只使用小程序内置元素（`view` / `text` / `input` / `scroll-view`）。

## 引入

```ts
import { YsInfinitePage } from "@ys-knife-crud/taro";
```

## 基础用法

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YsInfinitePage } from "@ys-knife-crud/taro";
import { Operator, con, filter } from "@ys-knife-crud/core";
import type { FilterInfo, PageFunc, TableAction } from "@ys-knife-crud/core";

interface MockRow { id: number; name: string; }

const pageRef = ref<InstanceType<typeof YsInfinitePage> | null>(null);

const actions: TableAction[] = [
  {
    name: "export",
    desc: "导出 Excel",
    plain: true,
    async execute() {
      const rows = pageRef.value?.list?.items ?? [];
      wx.showToast({ title: `将导出 ${rows.length} 行`, icon: "none" });
    },
  },
  {
    name: "load-next",
    desc: "加载更多",
    async execute() {
      pageRef.value?.list?.loadNextPage();
    },
  },
];

async function dataFun(req: { limit: number; offset: number }) {
  // ...
}

function onSearch(_filter: FilterInfo): void { pageRef.value?.list?.reload(); }
function onReset(): void { pageRef.value?.list?.reload(); }
</script>

<template>
  <YsInfinitePage
    ref="pageRef"
    v-model="keyword"
    :data-fun="dataFun"
    :text-filter-builder="kw => filter('name', Operator.Contains, con(kw)) as unknown as FilterInfo"
    :actions="actions"
    placeholder="请输入姓名"
    @search="onSearch"
    @reset="onReset"
  >
    <!-- FilterPanel 条件区（默认插槽）：业务自定义搜索项 -->
    <template #filter-default>
      <MyProviderFilter v-model="providerIndex" />
    </template>

    <!-- List 行渲染 -->
    <template #list-default="{ row, index }">
      <view>{{ index + 1 }}. {{ (row as MockRow).name }}</view>
    </template>

    <!-- CommandBar 默认插槽：选中提示条 / 刷新按钮 / 其他自定义内容 -->
    <template #cmd-default>
      <view class="selection-bar">已选 {{ selectedCount }} 项</view>
      <view class="reload-btn" @tap="pageRef?.list?.reload()">刷新</view>
    </template>
  </YsInfinitePage>
</template>
```

## Props

| 属性 | 所属子组件 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| **modelValue** | FilterPanel | `string` | `""` | 文本搜索框值，支持 `v-model` |
| **showFilter** | 容器 | `boolean` | `true` | 是否渲染顶部 FilterPanel |
| **textFilterBuilder** | FilterPanel | `(kw: string) => FilterInfo \| null` | `undefined` | 文本条件委托（FilterPanel 唯一入口） |
| placeholder / filterText / searchButtonText / resetButtonText | FilterPanel | `string` | — | 透传 |
| defaultExpanded / showSearch / showReset | FilterPanel | `boolean` | — | 透传 |
| filterCustomClass / filterCustomStyle | FilterPanel | `string` | — | 透传 |
| **showCommandBar** | 容器 | `boolean` | `true` | 是否渲染底部 CommandBar |
| **actions** | CommandBar | `TableAction[]` | `[]` | 命令按钮数组 |
| cmdCustomClass / cmdCustomStyle | CommandBar | `string` | — | 透传 |
| **dataFun** | InfiniteList | `PageFunc<unknown>` | (required) | 数据获取函数 |
| pageSize / threshold / rowKey / immediate / showCheckbox | InfiniteList | — | — | 透传 |
| listCustomClass / listCustomStyle | InfiniteList | `string` | — | 透传 |

## Events

全部原样转发给使用方，InfinitePage 不做任何额外处理（不会把 search 自动触发 reload，业务侧自己串）。

| 事件 | 来源 | 说明 |
| --- | --- | --- |
| update:modelValue | FilterPanel | 文本搜索值变化 |
| search | FilterPanel | 点击查询 / 输入框确认，携带聚合后的 FilterInfo |
| reset | FilterPanel | 点击重置 |
| expand-change | FilterPanel | 条件区展开/折叠 |
| data-loaded | InfiniteList | 分页加载成功，两个参数 `(paged, isAppend)` |
| selection-change | InfiniteList | 行选中集合变化 |
| error | InfiniteList | 加载错误 |

## Expose

| 字段 | 说明 |
| --- | --- |
| `list` | `YsInfiniteList` 实例 |
| `filterPanel` | `YsFilterPanel` 实例 |

CommandBar 是空壳子，不暴露任何 ref——业务侧通过 list ref 调 `reload()` / `clearSelection()` / `loadNextPage()` 等。

## Slots

| 插槽 | 位置 | 说明 |
| --- | --- | --- |
| filter-default | FilterPanel 条件区 | 业务自定义搜索项（下拉、日期区间等），有内容才会渲染筛选按钮和条件区 |
| list-default | InfiniteList 行渲染 | 作用域 `{ row, index }`；未提供时以 JSON 文本兜底 |
| cmd-default | CommandBar 默认 | 底部扩展能力（选中提示条 / 刷新按钮 / 统计信息等），CommandBar 本身是空壳子 |

## 样式类

外层三段容器用内部类名控制，业务侧一般不需要覆盖。如果要自定义：

| 类名 | 说明 |
| --- | --- |
| `.yk-infinite-page` | 整个页面骨架，`height: 100vh` + flex column + `overflow: hidden` |
| `.yk-infinite-page__filter` | 顶部 FilterPanel 容器，`flex-shrink: 0` |
| `.yk-infinite-page__list` | 中间 InfiniteList 容器，`flex: 1` + `min-height: 0`（关键）+ 底部留白（给固定条让位） |
| `.yk-infinite-page__cmd` | 底部 CommandBar 容器，`position: fixed; bottom: 0`，恒定停留在视口底部 |

三段各自的内部样式（按钮、选中条等）由对应子组件的 class 控制，业务侧可直接写 `.yk-filter-panel__btn` / `.yk-command-bar__btn` 等覆盖。

## 注意事项

1. **不要用整个 InfinitePage 里的 `height: 100vh` 再套一个页面级容器**——会导致页面整体变高、scroll-view 滚动异常。`YsInfinitePage` 自己就是页面根节点。
2. **中间 InfiniteList 必须给 `height="100%"`**——组件内部已经硬编码了（不需要外部再传），因为中间 flex 子项的高度由父容器决定，InfinitePage 会把这个 prop 写死。
3. **`min-height: 0` 是 flex 中间子项能正确触发 scroll-view 滚动的关键**——如果用了其他布局容器替换中间段，也要保留这条规则。
4. **CommandBar 的 TableAction.execute() 里 table 参数是 undefined**——闭包抓 `pageRef.list`。
5. **InfinitePage 不自动联调 search → reload**——业务侧需要自己在 `@search` / `@reset` 回调里调 `pageRef.list.reload()`，因为不同业务查询后可能需要额外处理（如重置分页偏移量、清空选中）。
6. **底部 CommandBar 用 `position: fixed` 固定在视口底部**——不依赖 `100vh` 与可视高度是否一致，任何机型/工具栏形态下都停留在可视区域；列表容器已预留 `padding-bottom`，但如果你在 `cmd-default` 插槽里塞了多行内容让命令条变高，需要自己调大预留值（默认按单行 96rpx 计算）。

## 与 element-plus 版的 `YsTablePage` 的差异

| 能力 | element-plus `YsTablePage` | 小程序 `YsInfinitePage` |
| --- | --- | --- |
| 自动联调 filter ↔ table | ✅（search 自动触发 table reload） | ❌（业务侧自己串） |
| 顶部 FilterPanel | ✅ | ✅ |
| 中间 InfiniteList | ❌（是 YsTable） | ✅（scroll-view + 触底） |
| 底部 CommandBar | ❌（CommandBar 通常在 Table 顶部） | ✅ |
| 整体高度策略 | 不定高，依赖页面流式 | `height: 100vh` + 三段 flex |
