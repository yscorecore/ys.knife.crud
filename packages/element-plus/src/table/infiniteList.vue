<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch, type PropType } from "vue";
import type {
  Column,
  ExportApiFunc,
  Meta,
  MetaFunc,
  PageFunc,
} from "@ys-knife-crud/core";
import { useSelection, type SelectionTableLike } from "@ys-knife-crud/vue";
import ExportExcelDialog from "./exportExcelDialog.vue";

/**
 * YsInfiniteList —— 无限滚动列表
 *
 * 与 YsTable 共用同一套数据契约（dataFun: PageFunc<T>），但不渲染表格，
 * 而是「追加式」渲染列表：可视区域滚动到底部（距底部 threshold 像素内）时
 * 自动加载下一页并拼接到已有数据之后，直到返回的 hasNext 为 false。
 *
 * 移动端与桌面端通用：用 IntersectionObserver 监听底部哨兵元素触发加载，
 * 不依赖 scroll 事件，触屏与鼠标滚动行为一致。
 *
 * 每一项如何渲染由 #default 插槽决定（作用域 { row, index }），
 * 未提供插槽时以 JSON 兜底展示。
 */
defineOptions({ name: "YsInfiniteList" });

/**
 * 用运行时 props 声明（与 Table 同因）：Function 类型 prop 若走纯类型声明，
 * 构建器解析 PageFunc 泛型失败时会静默丢弃该 prop 成员，导致传入的 dataFun
 * 变成 fallthrough attribute。运行时声明不依赖类型静态分析，无此问题。
 */
const props = defineProps({
  /**
   * 数据获取函数，分页契约与 YsTable 完全一致：
   * ({ limit, offset }, signal?) => Promise<PagedList<T>>
   * 组件按 offset = 已加载条数 递增请求下一页，根据返回的 hasNext 判断是否还有更多。
   */
  dataFun: { type: Function as PropType<PageFunc<unknown>>, required: true },
  /** 每页条数（作为 dataFun 的 limit），默认 20 */
  pageSize: { type: Number, default: 20 },
  /** 距底部多少像素时提前加载下一页，默认 100 */
  threshold: { type: Number, default: 100 },
  /** 行 key（v-for 的 :key 取值字段），默认 "id" */
  rowKey: { type: String, default: "id" },
  /**
   * 滚动容器高度，默认 "100%"。任意 CSS 长度字符串（"400px" / "50vh" / "100%"）。
   * 容器自身 overflow-y:auto，在容器内滚动触发加载，与页面滚动解耦。
   */
  height: { type: String, default: "100%" },
  /** 挂载后是否立即加载第一页，默认 true；false 时经 ref 调 reload() 手动首载 */
  immediate: { type: Boolean, default: true },
  /**
   * 是否显示行首 checkbox（行选中），默认 false。与 YsTable 共用 useSelection：
   * 选中以 rowKey 为键跨页累计（滚动加载更多页不丢失已选），选中变化时
   * 派发 selection-change；亦可经 ref 调 clearSelection / selectAllOnPage /
   * invertSelectionOnPage 批量操作。
   */
  showCheckbox: { type: Boolean, default: false },
  /**
   * 元数据加载函数（与 YsTable 的 metaFun 同契约），可选。提供后导出使用其
   * showForDisplay 列（displayOrder 升序，缺省保持声明序）作为导出列，
   * 表名取 meta.displayName；缺省时导出列退化为已加载行的字段并集
   * （首见顺序），表名用「数据」。
   */
  metaFun: { type: Function as PropType<MetaFunc>, default: undefined },
  /** 导出实现工厂；缺省使用 core 的控制台假实现（只打日志不产出文件） */
  exportorFunc: { type: Function as PropType<ExportApiFunc>, default: undefined },
  /** 导出所有时分页拉取的步长（独立于界面 pageSize），默认 1000 */
  exportPageSize: { type: Number, default: 1000 },
});

/** 单次分页加载结果（PagedList）；对外事件基于此类型 */
type PagedResult = Awaited<ReturnType<PageFunc<unknown>>>;

/** 对外事件：data-loaded 在每次 dataFun 成功返回后触发 */
const emit = defineEmits<{
  (e: "data-loaded", paged: PagedResult, isAppend: boolean): void;
  (e: "error", error: unknown): void;
  /** 选中行集合变化时触发（勾选/取消/批量操作/重载后新增行不影响已选累计） */
  (e: "selection-change", rows: unknown[]): void;
}>();

/* ---------------- 状态 ---------------- */

/** 已加载的全部数据（分页累加） */
const items = ref<Record<string, unknown>[]>([]);
/** 首屏加载态（第一页） */
const loading = ref(false);
/** 追加加载态（第二页起） */
const loadingMore = ref(false);
/** 是否还有下一页（来自 PagedList.hasNext） */
const hasMore = ref(true);
/** 最近一次加载错误 */
const error = ref<unknown>(null);

/** 下一次请求的 offset = 已加载条数 */
const nextOffset = computed(() => items.value.length);

/* ---------------- 行选中（与 YsTable 共用 useSelection） ---------------- */

/**
 * 本组件没有 el-table 实例，tableEl 恒为 null——useSelection 中与 el-table
 * 同步相关的路径（restoreSelection / toggle 内部同步）自动退化为 no-op，
 * 只复用其跨页累计选中集合（rowKey → 行对象 Map）与批量操作。
 */
const tableEl = ref<SelectionTableLike | null>(null);

const {
  /** 跨页累计选中的行（滚动加载更多不丢失） */
  selectedRows,
  isRowSelected,
  toggleRowSelection,
  clearSelection,
  selectAllOnPage,
  invertSelectionOnPage,
} = useSelection({ tableEl, rows: items, rowKey: toRef(props, "rowKey") });

// 选中集合变化时对外派发（Map 每次变更都替换为新实例，watch 可靠触发）
watch(selectedRows, (rows) => emit("selection-change", [...rows]));

/* ---------------- 导出 Excel（与 YsTable 共用同一套 ExportExcelDialog） ---------------- */

/** 最近一次响应携带的总条数（驱动导出进度条初始分母） */
const totalCount = ref(0);

/** 元数据（metaFun 可选；加载失败视为无 meta，导出退化到行字段并集） */
const meta = ref<Meta | null>(null);

async function loadMeta(): Promise<void> {
  if (!props.metaFun) {
    meta.value = null;
    return;
  }
  try {
    meta.value = await props.metaFun();
  } catch {
    meta.value = null;
  }
}

/**
 * 导出列：与 YsTable 一致取 meta 的 showForDisplay 列（displayOrder 升序，
 * 缺省保持声明序）；无 meta 时退化为已加载行字段并集（首见顺序），
 * displayName 缺省回落 propertyPath。
 */
const exportColumns = computed<Column[]>(() => {
  const m = meta.value;
  if (m) {
    return m.columns
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.showForDisplay !== false)
      .sort((a, b) => (a.c.displayOrder ?? a.i) - (b.c.displayOrder ?? b.i))
      .map(({ c }) => c);
  }
  const seen = new Set<string>();
  const cols: Column[] = [];
  for (const row of items.value) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push({ propertyPath: key });
      }
    }
  }
  return cols;
});

/** 表名：meta.displayName 优先，缺省「数据」（与 YsTable 回退一致） */
const tableName = computed(() => meta.value?.displayName ?? "数据");

const exportDialogRef = ref<InstanceType<typeof ExportExcelDialog> | null>(null);

/** 打开导出对话框（范围选择：选中 / 当前已加载 / 所有数据） */
function openExportDialog(): void {
  exportDialogRef.value?.openExportDialog();
}

/* ---------------- 加载逻辑 ---------------- */

/**
 * 加载一页数据。
 * @param isAppend true = 加载下一页并追加；false = 重置为第一页
 */
async function loadPage(isAppend: boolean): Promise<void> {
  if (isAppend) {
    if (loadingMore.value || loading.value || !hasMore.value) return;
    loadingMore.value = true;
  } else {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
  }
  try {
    const offset = isAppend ? nextOffset.value : 0;
    const result = await props.dataFun({ limit: props.pageSize, offset });
    if (isAppend) {
      items.value.push(...(result.items as Record<string, unknown>[]));
    } else {
      items.value = result.items as Record<string, unknown>[];
    }
    hasMore.value = result.hasNext ?? false;
    // 响应带回总条数时更新（驱动导出进度条初始分母）
    if (result.totalCount != null) totalCount.value = result.totalCount;
    emit("data-loaded", result, isAppend);
  } catch (e) {
    error.value = e;
    emit("error", e);
  } finally {
    if (isAppend) loadingMore.value = false;
    else loading.value = false;
  }
}

/** 触发加载下一页（由 IntersectionObserver 调用，也可经 ref 手动触发） */
function loadNextPage(): void {
  void loadPage(true);
}

/** 重置并从第一页重新加载（清空已加载数据） */
function reload(): void {
  hasMore.value = true;
  void loadPage(false);
}

/* ---------------- IntersectionObserver 触底检测 ---------------- */

const scrollEl = ref<HTMLElement | null>(null);
const sentinelEl = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

/**
 * 监听列表底部的哨兵元素进入可视区：root 为滚动容器自身，
 * rootMargin 底部外扩 threshold 提前触发。相比 scroll 事件监听，
 * 无需节流且天然兼容触屏（移动端）。
 */
function setupObserver(): void {
  if (!scrollEl.value || !sentinelEl.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (
        entries.some((entry) => entry.isIntersecting) &&
        hasMore.value &&
        !loading.value &&
        !loadingMore.value
      ) {
        loadNextPage();
      }
    },
    {
      root: scrollEl.value,
      rootMargin: `0px 0px ${props.threshold}px 0px`,
      threshold: 0,
    },
  );
  observer.observe(sentinelEl.value);
}

function teardownObserver(): void {
  observer?.disconnect();
  observer = null;
}

/* ---------------- 生命周期与响应式 ---------------- */

onMounted(() => {
  setupObserver();
  void loadMeta();
  if (props.immediate) void loadPage(false);
});

onBeforeUnmount(teardownObserver);

// 数据源变化视为全新查询：重置为第一页重新加载
watch(() => props.dataFun, () => reload());

// 元数据源变化时重新加载 meta（影响导出列与表名）
watch(() => props.metaFun, () => void loadMeta());

// threshold 变化时重建 observer（rootMargin 依赖它）
watch(() => props.threshold, () => {
  teardownObserver();
  setupObserver();
});

/* ---------------- 暴露 API（供父组件经 ref 调用） ---------------- */

defineExpose({
  /** 当前已加载的全部数据 */
  items,
  /** 首屏加载态 */
  loading,
  /** 追加加载态 */
  loadingMore,
  /** 是否还有下一页 */
  hasMore,
  /** 重置并从第一页重新加载 */
  reload,
  /** 刷新：重置为第一页重新加载（与 YsTable 的 refresh 同名同义） */
  refresh: reload,
  /** 手动触发加载下一页（一般由滚动自动触发） */
  loadNextPage,
  /** rows 别名：当前已加载的全部数据（与 YsTable 的 rows 同名） */
  rows: items,
  /** 元数据（metaFun 加载结果；未提供 metaFun 或加载失败时为 null） */
  meta,
  /** 跨页累计选中的行（showCheckbox 开启时有意义） */
  selectedRows,
  /** 某行当前是否选中 */
  isRowSelected,
  /** 切换某行选中态（selected 缺省时取反） */
  toggleRowSelection,
  /** 清空全部选中 */
  clearSelection,
  /** 选中当前已加载的全部行（不影响「没有加载出来」的行） */
  selectAllOnPage,
  /** 反选当前已加载的行 */
  invertSelectionOnPage,
  /** 打开导出 Excel 对话框（选中 / 当前已加载 / 所有数据） */
  openExportDialog,
});
</script>

<template>
  <div ref="scrollEl" class="yk-infinite-list" :style="{ height }">
    <!-- 列表项：每一项由 #default 插槽渲染，未提供时以 JSON 兜底；
         showCheckbox 时行首渲染 checkbox，选中态经 isRowSelected 驱动 -->
    <div
      v-for="(row, index) in items"
      :key="String(row[rowKey])"
      class="yk-infinite-list__item"
      :class="{ 'is-selected': showCheckbox && isRowSelected(row) }"
    >
      <el-checkbox
        v-if="showCheckbox"
        class="yk-infinite-list__item-checkbox"
        :model-value="isRowSelected(row)"
        @change="toggleRowSelection(row, Boolean($event))"
      />
      <div class="yk-infinite-list__item-body">
        <slot :row="row" :index="index">
          <pre class="yk-infinite-list__item-json">{{ JSON.stringify(row, null, 2) }}</pre>
        </slot>
      </div>
    </div>

    <!-- 空状态：非加载中、无数据、无错误时显示 -->
    <div v-if="!loading && items.length === 0 && !error" class="yk-infinite-list__status">
      <slot name="empty">
        <el-empty description="暂无数据" />
      </slot>
    </div>

    <!-- 错误状态：加载失败时显示，提供重试入口 -->
    <div v-else-if="error" class="yk-infinite-list__status">
      <slot name="error" :error="error">
        <el-empty :description="`加载失败：${String(error)}`">
          <el-button type="primary" @click="reload">重试</el-button>
        </el-empty>
      </slot>
    </div>

    <!-- 触底哨兵：1px 占位元素，进入可视区（含 threshold 提前量）触发加载下一页 -->
    <div ref="sentinelEl" class="yk-infinite-list__sentinel" />

    <!-- 追加加载指示 -->
    <div v-if="loadingMore" class="yk-infinite-list__loading-more">
      <slot name="loading">
        <span class="yk-infinite-list__spinner" />
        <span>加载中...</span>
      </slot>
    </div>

    <!-- 没有更多：已有数据且无下一页时显示 -->
    <div v-if="!hasMore && items.length > 0 && !loading" class="yk-infinite-list__no-more">
      <slot name="no-more">
        <span>— 没有更多了 —</span>
      </slot>
    </div>

    <!-- 导出 Excel 对话框组（范围选择 / 进度 / 取消询问）——内部自管 useExportExcel。
         始终挂载：本组件不渲染入口按钮，外部经 expose 的 openExportDialog() 打开。
         「page」范围在本组件语义为「当前已加载」，pageScopeLabel 定制其文案；
         hasMore=false 时（已全部加载）与 YsTable 单页同理不提供「导出所有」 -->
    <ExportExcelDialog
      ref="exportDialogRef"
      :current-rows="items"
      :selected-rows="selectedRows"
      :data-fun="props.dataFun"
      :export-page-size="props.exportPageSize"
      :total="totalCount"
      :exportor-func="props.exportorFunc"
      :table-name="tableName"
      :columns="exportColumns"
      :has-more-page="hasMore"
      :export-selected="showCheckbox"
      page-scope-label="导出当前已加载"
    />
  </div>
</template>

<style scoped>
/* 滚动容器：自身 overflow-y:auto，height 由 prop 控制；
   min-height:0 保证在父级 flex 布局中可正常收缩 */
.yk-infinite-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  /* iOS 触摸惯性滚动（移动端） */
  -webkit-overflow-scrolling: touch;
}

.yk-infinite-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  transition: background-color 0.2s;
}

/* checkbox 列：固定宽度不参与收缩（对齐列表视图的行首 checkbox） */
.yk-infinite-list__item-checkbox {
  flex-shrink: 0;
  margin-left: 14px;
}

/* 行内容占满剩余宽度；min-width:0 允许插槽内容内部收缩而不撑破行 */
.yk-infinite-list__item-body {
  flex: 1;
  min-width: 0;
}

/* 选中态：主色浅底 + 左侧主色条，与表格/卡片选中语义一致 */
.yk-infinite-list__item.is-selected {
  background: var(--el-color-primary-light-9, #ecf5ff);
  box-shadow: inset 3px 0 0 var(--el-color-primary, #409eff);
}

/* JSON 兜底样式：与卡片/列表视图一致 */
.yk-infinite-list__item-json {
  margin: 0;
  padding: 12px 14px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 空状态 / 错误状态：撑满剩余空间并水平垂直居中 */
.yk-infinite-list__status {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 触底哨兵：1px 占位，仅作 IntersectionObserver 观察目标 */
.yk-infinite-list__sentinel {
  width: 100%;
  height: 1px;
  flex-shrink: 0;
}

.yk-infinite-list__loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  flex-shrink: 0;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}

.yk-infinite-list__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--el-color-primary, #409eff);
  border-top-color: transparent;
  border-radius: 50%;
  animation: yk-infinite-list-spin 0.8s linear infinite;
}

@keyframes yk-infinite-list-spin {
  to {
    transform: rotate(360deg);
  }
}

.yk-infinite-list__no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  flex-shrink: 0;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}
</style>
