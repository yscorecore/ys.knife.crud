<script setup lang="ts">
import { computed, ref, shallowRef, type ComputedRef, type PropType, type Ref } from "vue";
import type {
  Column,
  EnumOptionsSource,
  FilterInfo,
  PagedList,
  PageFunc,
  PageReq,
  TableAction,
  TableApi,
  TableProps as CoreTableProps,
  ViewMode,
} from "@ys-knife-crud/core";
import { emptyFilter } from "@ys-knife-crud/core";
import type { SavedQuery } from "../advancedFilter/advancedFilterContext";
import type { TablePageDataFun } from "./tablePageTypes";
import YsFilterPanel from "../filter/filterPanel.vue";
import YsCommandBar from "../commandBar/commandBar.vue";
import YsTableActionMenuButton from "../commandBar/tableActionMenuButton.vue";
import YsTable from "../table/table.vue";

defineOptions({ name: "YsTablePage" });

const props = defineProps({
  metaFun: { type: Function as PropType<CoreTableProps["metaFun"]>, required: true },
  dataFun: { type: Function as PropType<TablePageDataFun>, required: true },
  rowActionsFunc: { type: Function as PropType<NonNullable<CoreTableProps["rowActionsFunc"]>>, required: false },
  pageSize: { type: Number, default: 20 },
  pageSizes: { type: Array as PropType<number[]>, default: () => [10, 20, 50, 100] },
  showCheckbox: { type: Boolean, default: false },
  columnResizable: { type: Boolean, default: true },
  stickyHeader: { type: Boolean, default: false },
  loadCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["loadCustomConfigFun"]>>, required: false },
  saveCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["saveCustomConfigFun"]>>, required: false },
  exportPageSize: { type: Number, default: 1000 },
  exportorFunc: { type: Function as PropType<NonNullable<CoreTableProps["exportorFunc"]>>, required: false },
  collectorFunc: { type: Function as PropType<NonNullable<CoreTableProps["collectorFunc"]>>, required: false },
  /** 收集数据对话框标题，默认「收集数据」 */
  collectorTitle: { type: String, required: false },
  collectPageSize: { type: Number, default: 1000 },
  maxCollectCount: { type: Number, default: 10000 },
  rowKey: { type: String, default: "id" },
  viewMode: { type: String as PropType<ViewMode>, default: "table" },
  actions: { type: Array as PropType<TableAction[]>, default: () => [] },
  showSearch: { type: Boolean, default: true },
  showReset: { type: Boolean, default: true },
  searchButtonText: { type: String, default: "查询" },
  resetButtonText: { type: String, default: "重置" },
  enableAdvancedFilter: { type: Boolean, default: false },
  advancedColumns: { type: Array as PropType<Column[]>, default: () => [] },
  advancedOptionSources: { type: Object as PropType<Record<string, EnumOptionsSource>>, required: false },
  showQuickQuery: { type: Boolean, default: false },
  quickQueries: { type: Array as PropType<SavedQuery[]>, default: undefined },
  loadQuickQueryFun: { type: Function as PropType<() => Promise<SavedQuery[]>>, required: false },
  saveQuickQueryFun: { type: Function as PropType<(query: SavedQuery) => Promise<void | SavedQuery>>, required: false },
  singleLine: { type: Boolean, default: false },
});

type PagedResult = Awaited<ReturnType<CoreTableProps["dataFun"]>>;

const emit = defineEmits<{
  (e: "search", filter: FilterInfo): void;
  (e: "reset"): void;
  (e: "update:quickQueries", queries: SavedQuery[]): void;
  (e: "data-loaded", paged: PagedResult): void;
  (e: "update:viewMode", mode: ViewMode): void;
  (e: "update:showCheckbox", show: boolean): void;
  (e: "update:columnResizable", resizable: boolean): void;
  (e: "update:stickyHeader", sticky: boolean): void;
}>();

// 用 shallowRef 而非 ref：ref 的 UnwrapRef 经 keyof 会丢掉 FilterInfo 的 protected 成员，
// 导致 .value 退化成仅含公开方法的形状，无法再赋给 dataFun 的 FilterInfo 形参。
// shallowRef 不深解包，.value 保持完整的 FilterInfo 类型。
const currentFilter = shallowRef<FilterInfo>(emptyFilter());
const tableRef = ref<TableApi | null>(null);
const filterPanelRef = ref<{
  filter: ComputedRef<FilterInfo>;
  reset: () => void;
  mode: Ref<"simple" | "advanced">;
} | null>(null);

const adaptedDataFun = computed<PageFunc<unknown>>(() => async (req: PageReq, signal?: AbortSignal) => {
  return props.dataFun(req, currentFilter.value, signal);
});

const tableProps = computed(() => ({
  metaFun: props.metaFun,
  dataFun: adaptedDataFun.value,
  rowActionsFunc: props.rowActionsFunc,
  pageSize: props.pageSize,
  pageSizes: props.pageSizes,
  showCheckbox: props.showCheckbox,
  columnResizable: props.columnResizable,
  stickyHeader: props.stickyHeader,
  loadCustomConfigFun: props.loadCustomConfigFun,
  saveCustomConfigFun: props.saveCustomConfigFun,
  exportPageSize: props.exportPageSize,
  exportorFunc: props.exportorFunc,
  collectorFunc: props.collectorFunc,
  collectorTitle: props.collectorTitle,
  collectPageSize: props.collectPageSize,
  maxCollectCount: props.maxCollectCount,
  rowKey: props.rowKey,
  viewMode: props.viewMode,
}));

const filterPanelProps = computed(() => ({
  showSearch: props.showSearch,
  showReset: props.showReset,
  searchButtonText: props.searchButtonText,
  resetButtonText: props.resetButtonText,
  enableAdvancedFilter: props.enableAdvancedFilter,
  advancedColumns: props.advancedColumns,
  advancedOptionSources: props.advancedOptionSources,
  showQuickQuery: props.showQuickQuery,
  quickQueries: props.quickQueries,
  loadQuickQueryFun: props.loadQuickQueryFun,
  saveQuickQueryFun: props.saveQuickQueryFun,
  singleLine: props.singleLine,
}));

function onSearch(filter: FilterInfo): void {
  currentFilter.value = filter;
  emit("search", filter);
  tableRef.value?.reload();
}

function onReset(): void {
  currentFilter.value = emptyFilter();
  emit("reset");
  tableRef.value?.reload();
}

defineExpose({
  table: tableRef,
  filterPanel: filterPanelRef,
});
</script>

<template>
  <!-- 三段直接作为 .yk-table-page 的 flex 子项，class 经 Vue attrs 继承落到各组件根元素：
       filterPanel/commandBar flex-shrink:0 固定不被压缩，table flex:1 + min-height:0 撑满剩余。
       table 高度被父容器约束后，其内部 view-area 出滚动条、footer 分页固定底部。 -->
  <div class="yk-table-page">
    <!-- filter 行：左侧 filter 面板占满剩余宽度，右侧 filter-extra 插槽按内容宽度自适应。
         未传插槽时默认渲染 YsTableActionMenuButton；插槽内容为空时 :empty 隐藏右侧容器，filter 横向占满。 -->
    <div class="yk-table-page__filter-row">
      <YsFilterPanel
        ref="filterPanelRef"
        class="yk-table-page__filter"
        v-bind="filterPanelProps"
        @search="onSearch"
        @reset="onReset"
        @update:quick-queries="emit('update:quickQueries', $event)"
      >
        <slot />
      </YsFilterPanel>
      <div class="yk-table-page__filter-extra">
        <!-- 注意：默认按钮不能放在 <slot> 的 fallback 里——Vue 3 在插槽内容为空时会回退渲染
             fallback，导致「传空插槽 → filter 占满」失效。改用 $slots 存在性判断：
             传了插槽（即便内容为空）就不渲染默认按钮，空内容由 :empty 隐藏容器，filter 横向占满。 -->
        <slot name="filter-extra" />
        <YsTableActionMenuButton
          v-if="!$slots['filter-extra'] && tableRef"
          :table="tableRef"
        />
      </div>
    </div>

    <YsCommandBar
      class="yk-table-page__command"
      :actions="props.actions"
      :table="tableRef"
    >
      <template v-if="$slots['command-bar']" #default>
        <slot name="command-bar" />
      </template>
    </YsCommandBar>

    <YsTable
      ref="tableRef"
      class="yk-table-page__table"
      v-bind="tableProps"
      @data-loaded="emit('data-loaded', $event)"
      @update:view-mode="emit('update:viewMode', $event)"
      @update:show-checkbox="emit('update:showCheckbox', $event)"
        @update:column-resizable="emit('update:columnResizable', $event)"
        @update:sticky-header="emit('update:stickyHeader', $event)"
    >
      <template v-if="$slots.card" #card="scope"><slot name="card" v-bind="scope" /></template>
      <template v-if="$slots.list" #list="scope"><slot name="list" v-bind="scope" /></template>
      <template v-if="$slots.empty" #empty="scope"><slot name="empty" v-bind="scope" /></template>
      <template v-if="$slots.loading" #loading="scope"><slot name="loading" v-bind="scope" /></template>
      <template v-if="$slots.footer" #footer="scope"><slot name="footer" v-bind="scope" /></template>
    </YsTable>
  </div>
</template>

<style scoped>
.yk-table-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* filter 行：左侧面板 flex:1 占满剩余，右侧 extra 按内容宽度自适应；垂直居中对齐 */
.yk-table-page__filter-row {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.yk-table-page__filter {
  flex: 1;
  min-width: 0;
}
.yk-table-page__filter-extra {
  flex-shrink: 0;
  margin-left: 12px;
}
/* 插槽内容为空（或默认按钮未就绪）时隐藏右侧容器，filter 横向占满且不留间隙 */
.yk-table-page__filter-extra:empty {
  display: none;
}

.yk-table-page__command {
  flex-shrink: 0;
}

.yk-table-page__table {
  flex: 1;
  min-height: 0;
}
</style>
