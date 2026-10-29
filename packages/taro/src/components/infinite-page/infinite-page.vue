<script setup lang="ts">
import { ref, type PropType } from "vue";
import type { FilterInfo, PageFunc, TableAction } from "@ys-knife-crud/core";
import YsFilterPanel from "../filter-panel/filter-panel.vue";
import YsCommandBar from "../command-bar/command-bar.vue";
import YsInfiniteList from "../infinite-list/infinite-list.vue";

/**
 * YsInfinitePage（小程序版）—— 三合一页面骨架
 *
 * 把 YsFilterPanel（顶部）+ YsInfiniteList（中间，自适应撑满）+ YsCommandBar（底部）
 * 组合成一个固定三段式 flex 布局，省去业务页面每次手搓三段容器。
 *
 * 布局：
 * ┌─────────────────────────────┐
 * │  YsFilterPanel（顶部，高度自适应）      │
 * ├─────────────────────────────┤
 * │                             │
 * │  YsInfiniteList（flex:1）    │
 * │                             │
 * ├─────────────────────────────┤
 * │  YsCommandBar（底部，高度自适应）     │
 * └─────────────────────────────┘
 *
 * CommandBar 是空壳子，execute() 里的 table 参数收到 undefined——
 * 业务侧在 TableAction.execute() 里通过闭包抓 pageRef（InfinitePage 已把
 * 列表/面板的常用方法与状态平铺暴露，如 reload() / selectedRows / keyword 等）。
 */
defineOptions({ name: "YsInfinitePage" });

/**
 * 用单次 defineProps 声明所有 prop（避免把三个 defineProps 拆分成独立 prop block 时
 * Vue SFC 解析器按出现顺序生成的类型丢失成员）。FilterPanel / CommandBar / InfiniteList
 * 各自的透传项带语义化前缀（filterXxx / cmdXxx / listXxx），避免冲突。
 */
const props = defineProps({
  /* ---------- FilterPanel ---------- */
  /** 是否渲染顶部 FilterPanel，默认 true */
  showFilter: { type: Boolean, default: true },
  /** 文本搜索条件构造委托（FilterPanel 唯一入口） */
  textFilterBuilder: {
    type: Function as PropType<(keyword: string) => FilterInfo | null>,
    default: undefined,
  },
  placeholder: { type: String, default: "请输入" },
  filterText: { type: String, default: "筛选" },
  searchButtonText: { type: String, default: "查询" },
  resetButtonText: { type: String, default: "重置" },
  defaultExpanded: { type: Boolean, default: false },
  showSearch: { type: Boolean, default: true },
  showReset: { type: Boolean, default: true },
  filterCustomClass: { type: String, default: "" },
  filterCustomStyle: { type: String, default: "" },

  /* ---------- CommandBar ---------- */
  /** 是否渲染底部 CommandBar，默认 true */
  showCommandBar: { type: Boolean, default: true },
  /** 命令按钮数组（透传给 YsCommandBar） */
  actions: { type: Array as PropType<TableAction[]>, default: () => [] },
  cmdCustomClass: { type: String, default: "" },
  cmdCustomStyle: { type: String, default: "" },

  /* ---------- InfiniteList ---------- */
  dataFun: { type: Function as PropType<PageFunc<unknown>>, required: true },
  pageSize: { type: Number, default: 20 },
  threshold: { type: Number, default: 100 },
  rowKey: { type: String, default: "id" },
  immediate: { type: Boolean, default: true },
  showCheckbox: { type: Boolean, default: false },
  listCustomClass: { type: String, default: "" },
  listCustomStyle: { type: String, default: "" },
});

const emit = defineEmits<{
  (e: "search", filter: FilterInfo): void;
  (e: "reset"): void;
  (e: "expand-change", expanded: boolean): void;
  (e: "data-loaded", paged: unknown, isAppend: boolean): void;
  (e: "selection-change", rows: unknown[]): void;
  (e: "error", error: unknown): void;
}>();

/* ---------------- 内部 refs & expose ---------------- */

const listRef = ref<InstanceType<typeof YsInfiniteList> | null>(null);
const filterRef = ref<InstanceType<typeof YsFilterPanel> | null>(null);

type Row = Record<string, unknown>;

/**
 * 把两个子组件的常用能力平铺到页面级，业务侧直接 pageRef.reload() 即可，
 * 不必多一层 list / filterPanel。方法用箭头函数惰性转发（挂载前 ref 为 null，
 * 直接调用静默无操作）；状态用 getter 惰性读取，保持响应式跟踪。
 */
defineExpose({
  /* ---------- 数据加载（转发 YsInfiniteList） ---------- */
  /** 重置并从第一页重新加载 */
  reload: () => listRef.value?.reload(),
  /** 刷新：重置为第一页重新加载（与 reload 同义） */
  refresh: () => listRef.value?.refresh(),
  /** 手动加载下一页（一般触底自动触发，无需手动调） */
  loadNextPage: () => listRef.value?.loadNextPage(),

  /* ---------- 列表状态 ---------- */
  /** 当前已加载的全部数据 */
  get items() {
    return listRef.value?.items ?? [];
  },
  /** items 别名（与 YsTable 的 rows 同名） */
  get rows() {
    return listRef.value?.rows ?? [];
  },
  /** 首屏加载态 */
  get loading() {
    return listRef.value?.loading ?? false;
  },
  /** 追加加载态 */
  get loadingMore() {
    return listRef.value?.loadingMore ?? false;
  },
  /** 是否还有下一页 */
  get hasMore() {
    return listRef.value?.hasMore ?? false;
  },

  /* ---------- 多选（showCheckbox 开启时有意义） ---------- */
  /** 跨页累计选中的行 */
  get selectedRows() {
    return listRef.value?.selectedRows ?? [];
  },
  /** 某行当前是否选中 */
  isRowSelected: (row: Row) => listRef.value?.isRowSelected(row) ?? false,
  /** 切换某行选中态（selected 缺省时取反） */
  toggleRowSelection: (row: Row, selected?: boolean) =>
    listRef.value?.toggleRowSelection(row, selected),
  /** 清空全部选中 */
  clearSelection: () => listRef.value?.clearSelection(),
  /** 选中当前已加载的全部行 */
  selectAllOnPage: () => listRef.value?.selectAllOnPage(),
  /** 反选当前已加载的行 */
  invertSelectionOnPage: () => listRef.value?.invertSelectionOnPage(),

  /* ---------- 筛选面板（转发 YsFilterPanel） ---------- */
  /** 文本搜索框当前值 */
  get keyword() {
    return filterRef.value?.keyword ?? "";
  },
  /** 当前聚合后的查询条件 */
  get filter() {
    return filterRef.value?.filter;
  },
  /** 条件区是否展开 */
  get filterExpanded() {
    return filterRef.value?.expanded ?? false;
  },
  /** 切换条件区展开/折叠 */
  toggleFilter: () => filterRef.value?.toggle(),
  /** 重置筛选（清空文本 + 重置已注册子项 + 派发 reset） */
  resetFilter: () => filterRef.value?.reset(),

  /* ---------- 子组件实例（未平铺能力的逃生舱） ---------- */
  /** YsInfiniteList 实例 */
  get list() {
    return listRef.value;
  },
  /** YsFilterPanel 实例 */
  get filterPanel() {
    return filterRef.value;
  },
});

/* ---------------- 事件适配 ---------------- */

/** InfiniteList data-loaded 的事件对象里 PagedList + isAppend 是分开的，InfinitePage 原样转发 */
function onListDataLoaded(paged: unknown, isAppend: boolean): void {
  emit("data-loaded", paged, isAppend);
}
</script>

<template>
  <view class="yk-infinite-page">
    <!-- 顶部 FilterPanel -->
    <view v-if="showFilter" class="yk-infinite-page__filter">
      <YsFilterPanel
        ref="filterRef"
        :placeholder="placeholder"
        :filter-text="filterText"
        :search-button-text="searchButtonText"
        :reset-button-text="resetButtonText"
        :default-expanded="defaultExpanded"
        :show-search="showSearch"
        :show-reset="showReset"
        :text-filter-builder="textFilterBuilder"
        :custom-class="filterCustomClass"
        :custom-style="filterCustomStyle"
        @search="emit('search', $event)"
        @reset="emit('reset')"
        @expand-change="emit('expand-change', $event)"
      >
        <!-- FilterPanel 条件区默认插槽 -->
        <slot name="filter-default" />
      </YsFilterPanel>
    </view>

    <!-- 中间 InfiniteList：flex:1 + min-height:0 撑满剩余空间 -->
    <view class="yk-infinite-page__list">
      <YsInfiniteList
        ref="listRef"
        :data-fun="dataFun"
        :page-size="pageSize"
        :threshold="threshold"
        :row-key="rowKey"
        :immediate="immediate"
        :show-checkbox="showCheckbox"
        :height="'100%'"
        :class="listCustomClass"
        :style="listCustomStyle"
        @data-loaded="(paged, isAppend) => onListDataLoaded(paged, isAppend)"
        @selection-change="emit('selection-change', $event)"
        @error="emit('error', $event)"
      >
        <template #default="{ row, index }">
          <!-- 列表行默认插槽 -->
          <slot name="list-default" :row="row" :index="index" />
        </template>
      </YsInfiniteList>
    </view>

    <!-- 底部 CommandBar -->
    <view v-if="showCommandBar" class="yk-infinite-page__cmd">
      <YsCommandBar
        :actions="actions"
        :custom-class="cmdCustomClass"
        :custom-style="cmdCustomStyle"
      >
        <!-- CommandBar 默认插槽 -->
        <slot name="cmd-default" />
      </YsCommandBar>
    </view>
  </view>
</template>

<style lang="scss">
.yk-infinite-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6f8;
  box-sizing: border-box;
  overflow: hidden; /* 整页不产生滚动，只让中间列表内部滚 */
}

/* 三段容器：顶部高度由内容撑开，中间撑满，底部固定 */
.yk-infinite-page__filter {
  flex-shrink: 0;
}

/*
 * CommandBar 固定到视口底部（position: fixed），保证任何情况下都停留在可视区域：
 * 100vh 在个别机型/工具栏形态下会和可视高度不一致，靠 flex 末尾对齐会被挤到屏幕外。
 */
.yk-infinite-page__cmd {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background-color: #ffffff;
  border-top: 1rpx solid #ebeef5;
  /* iPhone 底部安全区：让按钮浮在 Home 指示条之上 */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.yk-infinite-page__list {
  flex: 1;
  min-height: 0; /* 关键：flex 子项要能正确收缩，scroll-view 才会滚 */
  overflow: hidden;
  /* 底部固定条已脱离文档流，给列表预留等高的底部留白，避免最后几行被遮住。
     96rpx = 命令条内容 64rpx + 上下 padding 各 16rpx（与 .yk-command-bar 一致） */
  padding-bottom: calc(96rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(96rpx + env(safe-area-inset-bottom));
}
</style>
