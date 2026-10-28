<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch, type PropType } from "vue";
import { createSelectorQuery } from "@tarojs/taro";
import type { PageFunc } from "@ys-knife-crud/core";

/**
 * YsInfiniteList（小程序版）—— 无限滚动列表
 *
 * 与 web 版（@ys-knife-crud/element-plus 的 YsInfiniteList）等价实现，
 * 共用同一套数据契约（dataFun: PageFunc<T>）：滚动到底部（lower-threshold
 * 提前量内）时自动加载下一页并追加，直到返回的 hasNext 为 false。
 *
 * 与 web 版的差异（小程序平台适配）：
 * - 触底检测：scroll-view 内置 @scrolltolower 事件 + lower-threshold，
 *   替代 IntersectionObserver（小程序原生能力，天然移动端）；
 * - 行选中：不依赖 @ys-knife-crud/vue 的 useSelection（其含 el-table 同步路径），
 *   以 rowKey → 行对象 Map 内联实现同一套跨页累计语义；
 * - 首屏不足一屏自动连填：SelectorQuery 量内容高度 <= 容器高度时继续加载；
 * - 元素约束：模板只用小程序内置元素（scroll-view / view / text / button）。
 *
 * 每一项如何渲染由 #default 插槽决定（作用域 { row, index }），
 * 未提供插槽时以 JSON 文本兜底展示。
 */
defineOptions({ name: "YsInfiniteList" });

/**
 * 用运行时 props 声明（与 web 版同因）：Function 类型 prop 若走纯类型声明，
 * 构建器解析 PageFunc 泛型失败时会静默丢弃该 prop 成员。运行时声明不依赖
 * 类型静态分析，无此问题。
 */
const props = defineProps({
  /**
   * 数据获取函数，分页契约与 YsTable / web 版 YsInfiniteList 完全一致：
   * ({ limit, offset }, signal?) => Promise<PagedList<T>>
   * 组件按 offset = 已加载条数 递增请求下一页，根据返回的 hasNext 判断是否还有更多。
   */
  dataFun: { type: Function as PropType<PageFunc<unknown>>, required: true },
  /** 每页条数（作为 dataFun 的 limit），默认 20 */
  pageSize: { type: Number, default: 20 },
  /** scroll-view 的 lower-threshold：距底部多少 px 触发 scrolltolower，默认 100 */
  threshold: { type: Number, default: 100 },
  /** 行 key（v-for 的 :key 取值字段），默认 "id" */
  rowKey: { type: String, default: "id" },
  /**
   * scroll-view 高度，默认 "100%"。任意 CSS 长度字符串（"600rpx" / "70vh" / "100%"）。
   * 滚动发生在 scroll-view 内部，与页面级滚动解耦。
   */
  height: { type: String, default: "100%" },
  /** 挂载后是否立即加载第一页，默认 true；false 时经 ref 调 reload() 手动首载 */
  immediate: { type: Boolean, default: true },
  /**
   * 是否显示行首 checkbox（行选中），默认 false。选中以 rowKey 为键跨页累计
   * （滚动加载更多页不丢失已选），选中变化时派发 selection-change；亦可经 ref
   * 调 clearSelection / selectAllOnPage / invertSelectionOnPage 批量操作。
   */
  showCheckbox: { type: Boolean, default: false },
});

/** 单次分页加载结果（PagedList）；对外事件基于此类型 */
type PagedResult = Awaited<ReturnType<PageFunc<unknown>>>;

/** 对外事件：data-loaded 在每次 dataFun 成功返回后触发 */
const emit = defineEmits<{
  (e: "data-loaded", paged: PagedResult, isAppend: boolean): void;
  (e: "error", error: unknown): void;
  /** 选中行集合变化时触发（勾选/取消/批量操作） */
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
/** 最近一次响应携带的总条数（预留：后续导出/统计用） */
const totalCount = ref(0);

/** 下一次请求的 offset = 已加载条数 */
const nextOffset = computed(() => items.value.length);

/* ---------------- 行选中（跨页累计，与 web 版 useSelection 同语义） ---------------- */

/** 选中集合：rowKey → 行对象；每次变更整体替换新 Map，保证 watch/computed 可靠触发 */
const selectedMap = ref<Map<string, Record<string, unknown>>>(new Map());

/** 跨页累计选中的行（滚动加载更多不丢失） */
const selectedRows = computed(() => [...selectedMap.value.values()]);

/** 某行当前是否选中 */
function isRowSelected(row: Record<string, unknown>): boolean {
  return selectedMap.value.has(String(row[props.rowKey]));
}

/** 切换某行选中态（selected 缺省时取反） */
function toggleRowSelection(row: Record<string, unknown>, selected?: boolean): void {
  const key = String(row[props.rowKey]);
  const next = new Map(selectedMap.value);
  const current = next.has(key);
  const target = selected ?? !current;
  if (target && !current) next.set(key, row);
  else if (!target && current) next.delete(key);
  selectedMap.value = next;
}

/** 清空全部选中 */
function clearSelection(): void {
  selectedMap.value = new Map();
}

/** 选中当前已加载的全部行（不影响「没有加载出来」的行） */
function selectAllOnPage(): void {
  const next = new Map(selectedMap.value);
  for (const row of items.value) next.set(String(row[props.rowKey]), row);
  selectedMap.value = next;
}

/** 反选当前已加载的行 */
function invertSelectionOnPage(): void {
  const next = new Map(selectedMap.value);
  for (const row of items.value) {
    const key = String(row[props.rowKey]);
    if (next.has(key)) next.delete(key);
    else next.set(key, row);
  }
  selectedMap.value = next;
}

// 选中集合变化时对外派发
watch(selectedRows, (rows) => emit("selection-change", [...rows]));

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
    // 响应带回总条数时更新
    if (result.totalCount != null) totalCount.value = result.totalCount;
    emit("data-loaded", result, isAppend);
  } catch (e) {
    error.value = e;
    emit("error", e);
  } finally {
    if (isAppend) loadingMore.value = false;
    else loading.value = false;
    // 每次加载完成后检查是否需要连填一屏（出错时仅允许用户手动重试，避免自动循环重试）
    if (!error.value) void fillViewport();
  }
}

/** 触发加载下一页（由 scrolltolower / 连填调用，也可经 ref 手动触发） */
function loadNextPage(): void {
  void loadPage(true);
}

/** 重置并从第一页重新加载（清空已加载数据） */
function reload(): void {
  hasMore.value = true;
  void loadPage(false);
}

/* ---------------- scroll-view 触底检测 ---------------- */

/** scroll-view 滚动到底部（lower-threshold 提前量内）时加载下一页 */
function onScrollToLower(): void {
  if (hasMore.value && !loading.value && !loadingMore.value) loadNextPage();
}

/* ---------------- 首屏不足一屏自动连填 ---------------- */

const instance = getCurrentInstance();

/**
 * 内容高度 <= 容器高度时继续加载下一页（循环直至撑满或无更多数据）。
 * 依赖 SelectorQuery 量取 scroll-view 与内容层的实际高度。
 */
async function fillViewport(): Promise<void> {
  if (!hasMore.value || loading.value || loadingMore.value) return;
  await nextTick();
  const proxy = instance?.proxy;
  if (!proxy) return;
  await new Promise<void>((resolve) => {
    createSelectorQuery()
      .in(proxy)
      .select(".yk-infinite-list")
      .boundingClientRect()
      .select(".yk-infinite-list__content")
      .boundingClientRect()
      .exec((res) => {
        const rects = (res ?? []) as Array<{ height: number } | null>;
        const container = rects[0];
        const content = rects[1];
        if (container && content && content.height <= container.height + 1) {
          loadNextPage();
        }
        resolve();
      });
  });
}

/* ---------------- 生命周期与响应式 ---------------- */

onMounted(() => {
  if (props.immediate) void loadPage(false);
});

// 数据源变化视为全新查询：重置为第一页重新加载
watch(() => props.dataFun, () => reload());

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
  /** 手动触发加载下一页（一般由触底自动触发） */
  loadNextPage,
  /** rows 别名：当前已加载的全部数据（与 YsTable 的 rows 同名） */
  rows: items,
  /** 跨页累计选中的行（showCheckbox 开启时有意义） */
  selectedRows,
  /** 某行当前是否选中 */
  isRowSelected,
  /** 切换某行选中态（selected 缺省时取反） */
  toggleRowSelection,
  /** 清空全部选中 */
  clearSelection,
  /** 选中当前已加载的全部行 */
  selectAllOnPage,
  /** 反选当前已加载的行 */
  invertSelectionOnPage,
});
</script>

<template>
  <scroll-view
    class="yk-infinite-list"
    :style="{ height }"
    scroll-y
    :lower-threshold="threshold"
    @scrolltolower="onScrollToLower"
  >
    <view class="yk-infinite-list__content">
      <!-- 列表项：每一项由 #default 插槽渲染，未提供时以 JSON 文本兜底；
           showCheckbox 时行首渲染自绘 checkbox，选中态经 isRowSelected 驱动 -->
      <view
        v-for="(row, index) in items"
        :key="String(row[rowKey])"
        class="yk-infinite-list__item"
        :class="{ 'is-selected': showCheckbox && isRowSelected(row) }"
      >
        <view
          v-if="showCheckbox"
          class="yk-infinite-list__item-checkbox"
          :class="{ 'is-checked': isRowSelected(row) }"
          @tap="toggleRowSelection(row)"
        >
          <text v-if="isRowSelected(row)" class="yk-infinite-list__checkbox-icon">✓</text>
        </view>
        <view class="yk-infinite-list__item-body">
          <slot :row="row" :index="index">
            <text class="yk-infinite-list__item-json">{{ JSON.stringify(row) }}</text>
          </slot>
        </view>
      </view>

      <!-- 空状态：非加载中、无数据、无错误时显示 -->
      <view v-if="!loading && items.length === 0 && !error" class="yk-infinite-list__status">
        <slot name="empty">
          <text class="yk-infinite-list__status-text">暂无数据</text>
        </slot>
      </view>

      <!-- 错误状态：加载失败时显示，提供重试入口 -->
      <view v-else-if="error" class="yk-infinite-list__status">
        <slot name="error" :error="error">
          <text class="yk-infinite-list__status-text">加载失败：{{ String(error) }}</text>
          <button class="yk-infinite-list__retry" size="mini" @tap="reload">重试</button>
        </slot>
      </view>

      <!-- 追加加载指示 -->
      <view v-if="loadingMore" class="yk-infinite-list__loading-more">
        <slot name="loading">
          <view class="yk-infinite-list__spinner" />
          <text>加载中...</text>
        </slot>
      </view>

      <!-- 没有更多：已有数据且无下一页时显示 -->
      <view v-if="!hasMore && items.length > 0 && !loading" class="yk-infinite-list__no-more">
        <slot name="no-more">
          <text>— 没有更多了 —</text>
        </slot>
      </view>
    </view>
  </scroll-view>
</template>

<style lang="scss">
/* 滚动容器：height 由 prop 控制；滚动在 scroll-view 内部进行。
   非 scoped + BEM 前缀（小程序端对 scoped 属性选择器支持有限，以前缀约定防泄漏） */
.yk-infinite-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

/* 内容层：min-height 100% 让空/错误状态可垂直居中，同时作为连填量高基准 */
.yk-infinite-list__content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.yk-infinite-list__item {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  background-color: #ffffff;
}

/* checkbox 列：自绘方框（固定尺寸不参与收缩） */
.yk-infinite-list__item-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  margin: 0 20rpx 0 24rpx;
  box-sizing: border-box;
  border: 2rpx solid #dcdfe6;
  border-radius: 6rpx;
  background-color: #ffffff;

  &.is-checked {
    border-color: #409eff;
    background-color: #409eff;
  }
}

.yk-infinite-list__checkbox-icon {
  color: #ffffff;
  font-size: 24rpx;
  line-height: 1;
}

/* 行内容占满剩余宽度；min-width 0 允许插槽内容内部收缩 */
.yk-infinite-list__item-body {
  flex: 1;
  min-width: 0;
}

/* 选中态：主色浅底（与 web 版选中语义一致） */
.yk-infinite-list__item.is-selected {
  background-color: #ecf5ff;
}

/* JSON 兜底样式 */
.yk-infinite-list__item-json {
  display: block;
  padding: 24rpx 28rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #606266;
  word-break: break-all;
}

/* 空状态 / 错误状态：撑满剩余空间并居中 */
.yk-infinite-list__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48rpx;
}

.yk-infinite-list__status-text {
  font-size: 26rpx;
  color: #909399;
}

.yk-infinite-list__retry {
  margin-top: 24rpx;
}

.yk-infinite-list__loading-more,
.yk-infinite-list__no-more {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 28rpx;
  color: #909399;
  font-size: 26rpx;
}

.yk-infinite-list__spinner {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
  border: 4rpx solid #409eff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: yk-infinite-list-spin 0.8s linear infinite;
}

@keyframes yk-infinite-list-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
