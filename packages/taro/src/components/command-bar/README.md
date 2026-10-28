# YsCommandBar 命令面板（小程序版）

参照 `@ys-knife-crud/element-plus` 的 commandBar.vue，为小程序（Taro + Vue3）精简适配的命令面板。

**空壳子定位**——组件只负责两件事：

1. 按 `actions` 数据驱动渲染命令按钮（支持 `type` 变体 + `plain` 变体），流式 flex 布局，宽度不够时自动换行
2. 暴露一个默认插槽，让外部追加任何自定义内容（选中提示条、刷新按钮、统计信息等）

**不内置任何功能**：没有刷新、没有选中提示条、没有下拉菜单、不持有列表引用。业务侧通过闭包自己抓 ref。

只使用小程序内置元素（`view` / `text`），不使用 `div`。

## 引入

```ts
import { YsCommandBar } from "@ys-knife-crud/taro";
```

组件样式随包内的 `dist/index.css` 一起引入（构建时会自动带上），类名统一使用 `.yk-command-bar*` 前缀。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YsCommandBar, YsInfiniteList } from "@ys-knife-crud/taro";
import type { TableAction } from "@ys-knife-crud/core";

const listRef = ref<InstanceType<typeof YsInfiniteList> | null>(null);

// 命令面板不持有任何状态，execute 通过闭包抓 listRef
const actions: TableAction[] = [
  {
    name: "export",
    desc: "导出 Excel",
    plain: true,
    async execute() {
      const allRows = listRef.value?.items ?? [];
      wx.showToast({ title: `将导出 ${allRows.length} 行`, icon: "none" });
    },
  },
  {
    name: "load-next",
    desc: "加载更多",
    async execute() {
      listRef.value?.loadNextPage();
    },
  },
];
</script>

<template>
  <YsCommandBar :actions="actions" />
  <YsInfiniteList ref="listRef" :data-fun="dataFun" :page-size="10" show-checkbox />
</template>
```

## 默认插槽追加外部内容（替代内置刷新 / 选中提示条）

CommandBar 自己不做选中提示条和刷新按钮——这些能力由外部按需追加到默认插槽：

```vue
<template>
  <YsCommandBar class="cmd-bar" :actions="actions">
    <!-- 选中提示条：选中数 > 0 时才显示，样式可自定义 -->
    <view v-if="listRef?.selectedRows?.length" class="selection-bar">
      <text>已选 {{ listRef.selectedRows.length }} 项</text>
      <text @tap="listRef.clearSelection()">清空</text>
    </view>

    <!-- 右侧刷新按钮：margin-left:auto 推到最右 -->
    <view class="reload-btn" @tap="listRef?.reload()">
      <text>刷新</text>
    </view>
  </YsCommandBar>
</template>

<style lang="scss">
.selection-bar {
  display: inline-flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 20rpx;
  background-color: #ecf5ff;
  border: 2rpx solid #d9ecff;
  border-radius: 8rpx;
  color: #409eff;
  font-size: 26rpx;
}

.reload-btn {
  margin-left: auto; /* 推到面板最右端 */
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 8rpx;
  background-color: #ffffff;
  border: 2rpx solid #dcdfe6;
  font-size: 28rpx;
  color: #606266;
}
</style>
```

按钮、提示条、刷新——任何组件都可以塞进插槽；CommandBar 只负责让它们流式排好。

## API

### Props

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| actions | 命令按钮数组；每条渲染为一个按钮，点击调 `execute()` | `TableAction[]` | `[]` |
| customClass | 追加到根节点的类名（外部自定义样式入口） | `string` | `""` |
| customStyle | 追加到根节点的内联样式 | `string` | `""` |

### Events

组件不派发自定义事件——`actions` 的回调自己处理业务逻辑。

### Slots

| 插槽 | 说明 |
| --- | --- |
| default | 外部自定义内容，流式 flex 排列；用 `margin-left: auto` 可推到面板右端 |

### Expose

组件不 expose 任何属性或方法。

### `TableAction`（来自 `@ys-knife-crud/core`）

| 字段 | 说明 |
| --- | --- |
| name | 命令唯一标识 |
| desc | 按钮显示文案 |
| type | 按钮类型（可选）：`primary` / `success` / `warning` / `danger` / `default` |
| plain | 是否 plain 变体（主色文字 + 浅底 + 细边框） |
| execute(table) | 点击时执行；CommandBar 以 `undefined` 调用，业务侧通过闭包自己抓 ref |

## 样式类

| 类名 | 说明 |
| --- | --- |
| `.yk-command-bar` | 面板容器，flex + wrap，padding `16rpx 24rpx` |
| `.yk-command-bar__btn` | 命令按钮基类（自绘 `view`，不用原生 `button`） |
| `.yk-command-bar__btn-text` | 按钮内文字 |
| `.yk-command-bar__btn--primary` / `--success` / `--warning` / `--danger` / `--default` | type 变体 |
| `.yk-command-bar__btn--plain` | plain 变体修饰符，与 type 组合覆盖 |

外部自定义样式有两种方式：传 `custom-class` / `custom-style`，或直接在自己的样式文件里用上述类名覆盖（同名类选择器按顺序覆盖）。

## 注意事项

1. **`execute` 里的 `table` 参数是 `undefined`**：CommandBar 不持有任何列表引用。`TableAction` 的签名来自 `@ys-knife-crud/core`，但小程序端只传 `undefined`——业务侧要通过闭包自己抓 ref。
2. **`actions` 为空数组时命令区不渲染**：整个 CommandBar 只显示默认插槽内容（如果插槽也为空，面板就只剩 padding）。
3. **按钮用自绘 `view` 而不是原生 `button`**：小程序原生 `button` 有默认 padding / 边框 / line-height 干扰，不便统一样式；自绘 `view` + `text` 更可控。
4. **样式非 scoped**：小程序端 scoped 支持有限，靠 `.yk-` 前缀防泄漏；插槽里塞的自定义内容建议也使用带前缀的类名。
5. **刷新按钮、选中提示条等都在外部做**：CommandBar 是空壳子，这些辅助能力（刷新防抖、选中条显隐逻辑、跨页清空等）业务侧自己实现。如果多个页面都需要，可以封一个 `SelectionBar` / `ReloadBtn` 子组件再塞进插槽。

## 与 element-plus 版的差异

| 能力 | element-plus 版 | 小程序版 |
| --- | --- | --- |
| 命令按钮（actions 数据驱动） | ✅ | ✅ |
| 刷新按钮 | ✅（内置 TableActionMenuButton） | ❌（空壳子，外部自己塞） |
| 选中提示条 + 全选/反选/清空 | ✅（内置 YsSelectionBar） | ❌（空壳子，外部自己塞） |
| 下拉菜单（列设置 / 导出 / 视图切换 / 列宽 / 锁定表头） | ✅ | ❌（小程序端暂不需要 YsTable） |
| 自定义插槽 | ✅ | ✅ |
| 持有列表引用 / 维护状态 | ✅（接收 `table: TableApi`） | ❌（空壳子，execute 只收 undefined） |
