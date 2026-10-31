<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import type { PropType } from "vue";
import { FilterInfo, emptyFilter } from "@ys-knife-crud/core";
import YsRootFilterPanel from "./root-filter-panel.vue";

/**
 * YsFilterPanel（小程序版）—— 筛选面板
 *
 * 参考 @ys-knife-crud/element-plus 的 YsFilterPanel，针对小程序做精简与平台适配：
 * - 顶部一行：左侧「筛选」按钮（点击展开/折叠下方条件区）+ 文本搜索框 + 「查询」「重置」按钮（默认右对齐）
 * - 下方条件区由默认插槽承载（日期区间、下拉选择等业务条件），可整体展开/折叠
 * - 「筛选」按钮与条件区只在插槽提供了自定义搜索项时才显示，否则只渲染搜索框与按钮
 * - 条件区收起时仅隐藏（v-show），插槽内控件保持挂载、状态不丢失
 * - 元素约束：模板只用小程序内置元素（view / text / input），不使用 div
 *
 * 查询条件聚合（与 element-plus 版一致）：
 * - 文本搜索框由 textFilterBuilder 委托构造 FilterInfo（返回 null / undefined 或输入为空时跳过）
 * - 插槽内的自定义搜索项组件经 useFilterPanelItem 注册各自的 FilterInfo
 * - 点击「查询」时按 AND 聚合所有非空条件，最终派发一个 FilterInfo 对象
 *
 * 文本框的值只在组件内部维护（不对外双向绑定）：输入即更新内部状态，
 * 点「重置」时清空；使用方如需读取当前文本值，经 expose 的 keyword 获取。
 *
 * 用法：
 * <ys-filter-panel :text-filter-builder="kw => filter('name', Operator.Contains, con(kw))" @search="onSearch" @reset="onReset">
 *   <!-- 自定义筛选条件（可注册 FilterInfo 的组件） -->
 * </ys-filter-panel>
 */
defineOptions({ name: "YsFilterPanel" });

const props = defineProps({
  /** 文本搜索框占位文案 */
  placeholder: { type: String, default: "请输入" },
  /** 展开/折叠触发器文案，默认「筛选」 */
  filterText: { type: String, default: "筛选" },
  /** 查询按钮文案，默认「查询」 */
  searchButtonText: { type: String, default: "查询" },
  /** 重置按钮文案，默认「重置」 */
  resetButtonText: { type: String, default: "重置" },
  /** 条件区初始是否展开，默认 false（「筛选」按钮默认折叠） */
  defaultExpanded: { type: Boolean, default: false },
  /** 是否渲染「查询」按钮，默认 true */
  showSearch: { type: Boolean, default: true },
  /** 是否渲染「重置」按钮，默认 true */
  showReset: { type: Boolean, default: true },
  /**
   * 文本搜索条件构造委托：入参是输入框当前值（已 trim），返回本次搜索应产出的 FilterInfo。
   * 返回 null / undefined 表示本次搜索不参与聚合（等价于输入为空）。
   *
   * 适用场景：
   *   - 最简单的单属性 contains：kw => filter('name', Operator.Contains, con(kw))
   *   - 一个输入框映射多个属性（OR）：
   *       kw => FilterInfo.createOr(
   *         filter('name', Operator.Contains, con(kw)),
   *         filter('code', Operator.Contains, con(kw))
   *       )
   *
   * 未传委托时，文本搜索框仅作为 UI 占位，不会产生 FilterInfo（插槽里的自定义搜索项不受影响）。
   */
  textFilterBuilder: {
    type: Function as PropType<(keyword: string) => FilterInfo | null>,
    default: undefined,
  },
  /** 外部自定义样式：追加到根节点上的类名（覆盖内部样式的入口） */
  customClass: { type: String, default: "" },
  /** 外部自定义样式：追加到根节点上的内联样式字符串 */
  customStyle: { type: String, default: "" },
});

const emit = defineEmits<{
  /** 点击「查询」（或在输入框确认）：携带按 AND 聚合后的 FilterInfo */
  (e: "search", filter: FilterInfo): void;
  /** 点击「重置」：文本与已注册条件均已重置 */
  (e: "reset"): void;
  /** 条件区展开/折叠状态变化 */
  (e: "expand-change", expanded: boolean): void;
}>();

const slots = useSlots();

/** 是否提供了自定义搜索项（插槽有内容）：决定「筛选」按钮与条件区是否显示 */
const hasConditions = computed<boolean>(() => !!slots.default);

/** 条件区是否展开（初始取 defaultExpanded） */
const expanded = ref(props.defaultExpanded);

/** 文本搜索框的值：组件内部状态，不对外双向绑定 */
const keyword = ref("");

/* ---------------- 条件聚合 ---------------- */
/** 聚合容器：子项注册与 AND 聚合下沉到无 UI 的 YsRootFilterPanel */
const rootRef = ref<InstanceType<typeof YsRootFilterPanel> | null>(null);

/** 文本搜索条件：输入 trim 后为空或没传 textFilterBuilder 委托时跳过；否则用委托构造 */
const textFilter = computed<FilterInfo | null>(() => {
  const value = keyword.value.trim();
  if (!value || !props.textFilterBuilder) return null;
  const built = props.textFilterBuilder(value);
  return built ?? null;
});

/** 最终查询条件：文本搜索作为 extraFilter 交给 root，与子项条件按 AND 聚合；全空时由 root 返回 emptyFilter() */
const filterInfo = computed<FilterInfo>(
  () => (rootRef.value?.filter ?? emptyFilter()) as unknown as FilterInfo,
);

/** 切换条件区展开/折叠 */
function toggleExpand(): void {
  expanded.value = !expanded.value;
  emit("expand-change", expanded.value);
}

/** 文本输入：小程序 input 的值在 event.detail.value（DOM 类型下 detail 非该结构，运行时按小程序取） */
function onInput(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  keyword.value = detail?.value ?? "";
}

/** 查询：把聚合后的 FilterInfo 抛给使用方 */
function onSearch(): void {
  emit("search", filterInfo.value);
}

/** 重置：清空文本 + 让 root 重置所有已注册子项，再通知使用方 */
function onReset(): void {
  keyword.value = "";
  rootRef.value?.reset();
  emit("reset");
}

defineExpose({
  /** 文本搜索框当前值（只读读取用，外部不能写入） */
  keyword,
  /** 条件区是否展开 */
  expanded,
  /** 当前聚合后的查询条件 */
  filter: filterInfo,
  /** 切换条件区展开/折叠 */
  toggle: toggleExpand,
  /** 重置（清空文本 + 重置已注册子项 + 派发 reset） */
  reset: onReset,
});
</script>

<template>
  <view :class="['yk-filter-panel', customClass]" :style="customStyle">
    <!-- 顶部操作栏：筛选展开/折叠 | 文本搜索框 | 查询 | 重置（默认右对齐） -->
    <view class="yk-filter-panel__bar">
      <!-- 「筛选」按钮仅在有自定义搜索项时显示 -->
      <view v-if="hasConditions" class="yk-filter-panel__trigger" @tap="toggleExpand">
        <text class="yk-filter-panel__trigger-text">{{ filterText }}</text>
        <text class="yk-filter-panel__arrow">{{ expanded ? "▲" : "▼" }}</text>
      </view>

      <!-- 输入框外包一层 view：小程序端 input 直接做 flex 子项时宽度会塌陷，需由容器撑开 -->
      <view class="yk-filter-panel__field">
        <input
          class="yk-filter-panel__input"
          :value="keyword"
          :placeholder="placeholder"
          placeholder-class="yk-filter-panel__placeholder"
          @input="onInput"
          @confirm="onSearch"
        />
      </view>

      <view class="yk-filter-panel__actions">
        <view
          v-if="showSearch"
          class="yk-filter-panel__btn yk-filter-panel__btn--primary"
          @tap="onSearch"
        >
          <text>{{ searchButtonText }}</text>
        </view>
        <view
          v-if="showReset"
          class="yk-filter-panel__btn yk-filter-panel__btn--default"
          @tap="onReset"
        >
          <text>{{ resetButtonText }}</text>
        </view>
      </view>
    </view>

    <!-- 条件区：root 只做注册与聚合，不渲染额外节点；子项直接落在此 view 内，布局不变 -->
    <view v-if="hasConditions" v-show="expanded" class="yk-filter-panel__conditions">
      <YsRootFilterPanel ref="rootRef" :extra-filter="textFilter">
        <slot />
      </YsRootFilterPanel>
    </view>
  </view>
</template>

<style lang="scss">
/* 面板：白底圆角容器；非 scoped + BEM 前缀（小程序端 scoped 支持有限，以前缀约定防泄漏） */
.yk-filter-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  background-color: #ffffff;
  border-radius: 12rpx;
}

/* 顶部操作栏：单行排布，输入框占满中间剩余空间 */
.yk-filter-panel__bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
}

/* 筛选触发器：点击展开/折叠条件区 */
.yk-filter-panel__trigger {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.yk-filter-panel__trigger-text {
  font-size: 28rpx;
  color: #35f;
}

.yk-filter-panel__arrow {
  margin-left: 6rpx;
  font-size: 20rpx;
  color: #35f;
}

/* 输入框容器：撑开中间剩余空间，视觉样式（浅灰底、圆角）放在容器上。
   注意：容器用普通块布局，不要再用 flex —— 小程序原生 input 作为 flex 子项时宽度会塌陷，
   表现为输入框只剩一个光标、placeholder 不可见。 */
.yk-filter-panel__field {
  flex: 1;
  min-width: 0;
  height: 64rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  background-color: #f2f3f5;
  border-radius: 8rpx;
  overflow: hidden;
}

/* 文本搜索框：铺满容器，自身不再负责底色/圆角 */
.yk-filter-panel__input {
  width: 100%;
  height: 100%;
  font-size: 28rpx;
  line-height: 64rpx;
  color: #303133;
  background-color: transparent;
}

.yk-filter-panel__placeholder {
  color: #909399;
}

/* 按钮组：不参与收缩，默认右对齐（margin-left:auto 兜底） */
.yk-filter-panel__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 16rpx;
  margin-left: auto;
}

.yk-filter-panel__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  font-size: 28rpx;
  line-height: 1;
}

/* 查询：主色实心 */
.yk-filter-panel__btn--primary {
  color: #ffffff;
  background-color: #35f;
}

/* 重置：浅灰底 */
.yk-filter-panel__btn--default {
  color: #606266;
  background-color: #f2f3f5;
}

/* 条件区：纵向排列插槽内容，与顶部操作栏之间加一条浅分隔线 */
.yk-filter-panel__conditions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 24rpx 24rpx;
  border-top: 1rpx solid #f2f3f5;
  padding-top: 20rpx;
}
</style>
