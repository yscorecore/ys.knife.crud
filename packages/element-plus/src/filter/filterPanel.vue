<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import type { PropType } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type {
  AdvancedConditionGroup,
  Column,
  EnumOptionsSource,
  FilterInfo,
} from "@ys.knife.crud/core";
import { emptyFilter } from "@ys.knife.crud/core";
import { FilterPanelKey, useAdvancedFilter, useFilterPanel } from "@ys.knife.crud/vue";
import YsAdvancedFilterPanel from "../advancedFilter/advancedFilterPanel.vue";
import type { SavedQuery } from "../advancedFilter/advancedFilterContext";

// 组件名统一带 ys 前缀：模板中以 <ys-filter-panel>（或 <YsFilterPanel>）使用，
// 同时保证全局注册（app.component）与 devtools 中名称稳定。
defineOptions({ name: "YsFilterPanel" });

/**
 * YsFilterPanel：查询面板。聚合多个 YsFilterItem 子组件的 FilterInfo 为一个 AND 组合：
 *
 * - 默认插槽放多个 <ys-filter-item>，子组件经 provide/inject 自动注册到本面板
 * - 内置「查询」「重置」按钮（showSearch/showReset 开关，默认 true）
 * - 面板级 keydown.enter 等价于点击「查询」按钮
 * - enableAdvancedFilter=true 时可切换到内置 YsAdvancedFilterPanel，两种模式经同一对
 *   search/reset 事件分发 FilterInfo，外部无感
 * - showQuickQuery=true 时，简单模式也显示「快速查询」标签（高级查询保存的预设），
 *   点击标签直接 emit('search', sq.filterInfo) 触发查询，无需切到高级模式；
 *   quickQueries（v-model）与高级面板的 saved-queries 共享，在两种模式间持久
 * - loadQuickQueryFun / saveQuickQueryFun 提供时，组件自动异步加载/持久化快速查询
 *   （参考 table.vue 的 metaFun / dataFun 模式）；后端只需存 group + name + description，
 *   filterInfo 由组件按 advancedColumns 重算
 *
 * 通用逻辑下沉到 @ys.knife.crud/vue 的 useFilterPanel；本组件只负责视图编排与事件分发。
 */
const props = defineProps({
  /** 是否渲染内置「查询」按钮，默认 true */
  showSearch: { type: Boolean, default: true },
  /** 是否渲染内置「重置」按钮，默认 true */
  showReset: { type: Boolean, default: true },
  /** 查询按钮文案，默认 "查询" */
  searchButtonText: { type: String, default: "查询" },
  /** 重置按钮文案，默认 "重置" */
  resetButtonText: { type: String, default: "重置" },
  /** 是否启用高级查询切换（显示切换按钮，允许切到高级查询面板） */
  enableAdvancedFilter: { type: Boolean, default: false },
  /** 高级查询模式所需的字段列表（enableAdvancedFilter=true 时必传） */
  advancedColumns: {
    type: Array as PropType<Column[]>,
    default: () => [],
  },
  /** 高级查询模式所需的枚举数据源，按 propertyPath 映射 */
  advancedOptionSources: {
    type: Object as PropType<Record<string, EnumOptionsSource>>,
    required: false,
  },
  /** 是否在简单模式下显示快速查询标签，默认 false */
  showQuickQuery: { type: Boolean, default: false },
  /** 快速查询列表（v-model:quick-queries），与高级面板的 saved-queries 共享 */
  quickQueries: {
    type: Array as PropType<SavedQuery[]>,
    default: undefined,
  },
  /**
   * 异步加载快速查询列表（如从后端拉取已保存的预设）。
   * 存在时组件 onMounted 自动调用，返回的 SavedQuery[] 填充快速查询列表。
   * 后端只需存 group + name + description，filterInfo 由组件按 advancedColumns 重算。
   */
  loadQuickQueryFun: {
    type: Function as PropType<() => Promise<SavedQuery[]>>,
    required: false,
  },
  /**
   * 异步保存快速查询（如持久化到后端）。
   * 高级模式点「保存」新增预设时自动调用；返回值若为 SavedQuery 则替换本地（如后端分配了 id）。
   */
  saveQuickQueryFun: {
    type: Function as PropType<(query: SavedQuery) => Promise<void | SavedQuery>>,
    required: false,
  },
  /**
   * 单行模式：开启后面板右上角显示展开/折叠按钮，折叠态（默认）放不下的 filter items
   * 整体隐藏（display:none，不裁切、不可交互），但**不清除已填值**——隐藏的 FilterItem
   * 仍注册在 panel，条件仍参与聚合查询。展开后恢复多行 wrap 布局。默认 false。
   * 高级查询模式不受此属性影响（仍是多行）。
   */
  singleLine: { type: Boolean, default: false },
});

const emit = defineEmits<{
  /** 查询按钮点击（或面板内回车）：携带聚合后的 FilterInfo */
  (e: "search", filter: FilterInfo): void;
  /** 重置按钮点击 */
  (e: "reset"): void;
  /** quick-queries v-model 更新事件 */
  (e: "update:quickQueries", queries: SavedQuery[]): void;
}>();

const { filter, register, reset } = useFilterPanel();
provide(FilterPanelKey, register);

/** 当前查询模式：simple=固定条件插槽，advanced=内置高级查询面板 */
const mode = ref<"simple" | "advanced">("simple");

/* ---- 单行模式（singleLine）相关状态 ---- */
/** 折叠态：true=单行（默认），false=展开恢复多行。仅 singleLine=true 时生效 */
const collapsed = ref(true);
/** 折叠态下被隐藏的 filter item 数量（用于 toggle 按钮 title 提示） */
const hiddenCount = ref(0);
/** filter items 包裹容器 ref（测量并控制子项显隐用）。
 *  非单行模式该容器 display:contents 透明，子项参与根 flex；单行折叠态切 display:flex 可测量 */
const itemsEl = ref<HTMLElement | null>(null);

/** 内部 fallback 状态（quickQueries prop 未传时使用） */
const internalQuickQueries = ref<SavedQuery[]>([]);

/** 当前生效的快速查询列表（prop 优先，否则内部 ref） */
const quickQueriesState = computed<SavedQuery[]>(
  () => (props.quickQueries ?? internalQuickQueries.value) as SavedQuery[],
);

/** 高级查询面板实例引用（高级模式下用于读 filter / 调 reset / 应用已存查询） */
const advancedPanelRef = ref<{
  filter: FilterInfo;
  reset: () => void;
  applySavedQuery: (sq: SavedQuery) => void;
} | null>(null);

/** 按 mode 分流的聚合 FilterInfo */
const currentFilter = computed<FilterInfo>(() => {
  if (mode.value === "advanced") {
    return (advancedPanelRef.value?.filter ?? emptyFilter()) as unknown as FilterInfo;
  }
  return filter.value;
});

function onSearch(): void {
  emit("search", currentFilter.value);
}

function onReset(): void {
  if (mode.value === "advanced") {
    advancedPanelRef.value?.reset();
  } else {
    reset();
  }
  emit("reset");
}

/* 高级面板 search/reset 透传 */
function onAdvancedSearch(f: FilterInfo): void {
  emit("search", f);
}
function onAdvancedReset(): void {
  emit("reset");
}

/* 高级面板 saved-queries 更新 → 检测新增项 → 调 saveQuickQueryFun 持久化 → 写入 v-model */
async function onSavedQueriesUpdate(queries: SavedQuery[]): Promise<void> {
  // 检测新增的查询（id 不在当前列表中）
  const currentIds = new Set(quickQueriesState.value.map((q) => q.id));
  const newQueries = queries.filter((q) => !currentIds.has(q.id));

  if (props.saveQuickQueryFun && newQueries.length > 0) {
    // 逐个调用 saveQuickQueryFun 持久化；若返回 SavedQuery 则替换（如后端分配了 id）
    const persisted: SavedQuery[] = [];
    for (const nq of newQueries) {
      try {
        const result = await props.saveQuickQueryFun(nq);
        persisted.push(result ?? nq);
      } catch {
        ElMessage.error(`保存快速查询「${nq.name}」失败`);
        persisted.push(nq); // 失败仍保留本地
      }
    }
    // 用持久化后的查询替换新增项
    let result = queries;
    if (persisted.some((p, i) => p !== newQueries[i])) {
      const map = new Map(newQueries.map((nq, i) => [nq.id, persisted[i] ?? nq]));
      result = queries.map((q) => map.get(q.id) ?? q);
    }
    internalQuickQueries.value = result;
    emit("update:quickQueries", result);
  } else {
    internalQuickQueries.value = queries;
    emit("update:quickQueries", queries);
  }
}

/* ---- filterInfo 重算：后端返回的 SavedQuery 只存 group，filterInfo 需按
 * ---- advancedColumns 重新聚合。创建一个 useAdvancedFilter 实例做转换。 */
let _converter: ReturnType<typeof useAdvancedFilter> | null = null;
function getConverter(): ReturnType<typeof useAdvancedFilter> | null {
  if (!_converter && props.advancedColumns.length) {
    _converter = useAdvancedFilter({
      columns: props.advancedColumns,
      optionSources: props.advancedOptionSources,
    });
  }
  return _converter;
}

function recomputeFilterInfo(group: AdvancedConditionGroup): SavedQuery["filterInfo"] {
  const api = getConverter();
  if (!api) return { toString: () => "", isEmpty: () => true };
  api.rootGroup.value = JSON.parse(JSON.stringify(group)) as AdvancedConditionGroup;
  return api.filter.value as unknown as SavedQuery["filterInfo"];
}

/* onMounted：若提供了 loadQuickQueryFun，异步加载已存查询并填充列表 */
onMounted(async () => {
  if (!props.loadQuickQueryFun) return;
  try {
    const loaded = await props.loadQuickQueryFun();
    // 后端返回的 filterInfo 可能缺失或不可用，按 group 重算
    const withFilterInfo = loaded.map((sq) => ({
      ...sq,
      filterInfo: sq.filterInfo ?? recomputeFilterInfo(sq.group),
    }));
    internalQuickQueries.value = withFilterInfo;
    emit("update:quickQueries", withFilterInfo);
  } catch {
    ElMessage.error("加载快速查询失败");
  }
});

/* keydown.enter 守卫：高级模式由内部 YsAdvancedFilterPanel 自行处理回车 */
function onRootEnter(): void {
  if (mode.value === "advanced") return;
  onSearch();
}

function switchToAdvanced(): void {
  mode.value = "advanced";
}
function switchToSimple(): void {
  mode.value = "simple";
}

/* ---------------- 单行模式（singleLine）折叠/展开与溢出测量 ---------------- */

/** 切换折叠/展开。展开时先恢复所有 child 显示，折叠时 nextTick 后测量隐藏溢出项 */
function toggleCollapse(): void {
  collapsed.value = !collapsed.value;
}

/**
 * 折叠态：测量 items 容器，放不下的 child 整体 display:none 隐藏（不裁切、不可交互）。
 * 展开态或非单行模式：恢复所有 child 显示，清除动态 max-width。
 *
 * 实现要点：
 * - items 容器在折叠态 flex:0 1 auto（不 grow 占满），JS 动态设 max-width = 容器宽 - actions宽 - gap，
 *   让 actions 紧随其后同行（不居右）；其 clientWidth 即可用宽度，overflow:hidden 兜底裁切
 * - actions flex-shrink:0 始终可见；saved 默认 width:100% 独立换行到第二行；toggle absolute 右上角
 * - 被隐藏的 FilterItem 实例仍存活、值仍参与聚合查询（仅视觉隐藏）
 */
function measureAndHide(): void {
  const container = itemsEl.value;
  if (!container) return;
  // 先恢复所有 child 显示，便于测量真实宽度
  for (const child of Array.from(container.children)) {
    (child as HTMLElement).style.display = "";
  }
  // 展开态或非单行模式：清除动态 max-width，无需隐藏
  if (!props.singleLine || !collapsed.value) {
    hiddenCount.value = 0;
    container.style.maxWidth = "";
    return;
  }
  // 折叠态：动态设 items 容器 max-width = 容器宽 - actions宽 - gap，
  // 让 items 容器不占满，actions 紧随其后同行（不居右）；
  // items 容器 clientWidth 即可用宽度，溢出的 child 由下方循环 display:none 隐藏
  const actionsEl = container.nextElementSibling as HTMLElement | null;
  const actionsWidth = actionsEl ? actionsEl.offsetWidth : 0;
  const gap = 16; // 与 CSS .yk-filter-panel__items gap 一致
  container.style.maxWidth = `calc(100% - ${actionsWidth + gap}px)`;
  const available = container.clientWidth;
  let accumulated = 0;
  let hidden = 0;
  for (const child of Array.from(container.children)) {
    const el = child as HTMLElement;
    const w = el.offsetWidth;
    // 第一个 item 总是显示（即使超宽），后续超出则隐藏，避免全空
    if (accumulated > 0 && accumulated + w + gap > available) {
      el.style.display = "none";
      hidden++;
    } else {
      accumulated += w + gap;
    }
  }
  hiddenCount.value = hidden;
}

let resizeObserver: ResizeObserver | null = null;

/* 快速查询标签操作 */
function applyQuickQuery(sq: SavedQuery): void {
  if (mode.value === "advanced") {
    advancedPanelRef.value?.applySavedQuery(sq);
  } else {
    emit("search", sq.filterInfo as unknown as FilterInfo);
  }
}

async function removeQuickQuery(id: string): Promise<void> {
  const target = quickQueriesState.value.find((sq) => sq.id === id);
  const name = target?.name ?? "该查询";
  try {
    await ElMessageBox.confirm(
      `确定要删除快速查询「${name}」吗？`,
      "删除确认",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch {
    return; // 用户取消
  }
  await onSavedQueriesUpdate(quickQueriesState.value.filter((sq) => sq.id !== id));
}

/* ---------------- 单行模式生命周期：挂载时测量 + ResizeObserver 监听宽度变化 ---------------- */
onMounted(() => {
  if (!props.singleLine) return;
  // 首次测量（slot 子项已挂载）
  measureAndHide();
  resizeObserver = new ResizeObserver(() => measureAndHide());
  if (itemsEl.value) resizeObserver.observe(itemsEl.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

/** collapsed / singleLine 变化时，nextTick 后重新测量（DOM 已切换 display 模式） */
watch([collapsed, () => props.singleLine], () => {
  nextTick(measureAndHide);
});

/* ---------------- 暴露 API ---------------- */
defineExpose({
  filter: currentFilter,
  reset: onReset,
  mode,
});
</script>

<template>
  <div class="yk-filter-panel"
    :class="{ 'is-single-line': singleLine, 'is-collapsed': singleLine && collapsed }"
    @keydown.enter="onRootEnter">
    <!-- 简单模式：默认插槽 + 查询/重置/高级查询切换 + 快速查询标签 -->
    <template v-if="mode === 'simple'">
      <!-- 单行模式：右上角展开/折叠按钮（absolute 定位，恒在面板右上角）。
           折叠态显示双下箭头（点击展开），展开态显示双上箭头（点击折叠）；
           title 提示当前被隐藏的条件数 -->
      <el-button v-if="singleLine" link class="yk-filter-panel__toggle"
        :aria-label="collapsed ? '展开更多条件' : '折叠'"
        :title="collapsed ? (hiddenCount ? `展开（${hiddenCount} 个条件被隐藏）` : '展开') : '折叠'"
        @click="toggleCollapse">
        <svg v-if="collapsed" viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9" />
          <polyline points="6 14 12 20 18 14" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15" />
          <polyline points="18 10 12 4 6 10" />
        </svg>
      </el-button>

      <!-- filter items 容器：非单行模式 display:contents 透明（子项参与根 flex，保持原换行行为）；
           单行折叠态切 display:flex 可测量溢出并隐藏超宽项 -->
      <div class="yk-filter-panel__items" ref="itemsEl"><slot /></div>
      <div
        v-if="showSearch || showReset || enableAdvancedFilter"
        class="yk-filter-panel__actions"
      >
        <el-button v-if="showSearch" type="primary" @click="onSearch">{{ searchButtonText }}</el-button>
        <el-button v-if="showReset" @click="onReset">{{ resetButtonText }}</el-button>
        <el-button v-if="enableAdvancedFilter && !(singleLine && collapsed)" link type="primary" @click="switchToAdvanced">
          高级查询
        </el-button>
      </div>

      <!-- 快速查询按钮（简单模式下显示高级查询保存的预设，不可删除） -->
      <div v-if="showQuickQuery && quickQueriesState.length" class="yk-filter-panel__saved">
        <span class="yk-filter-panel__saved-label">快速查询：</span>
        <el-tooltip
          v-for="sq in quickQueriesState"
          :key="sq.id"
          :content="sq.description"
          :disabled="!sq.description"
          placement="top"
        >
          <el-button size="small" @click="applyQuickQuery(sq)">
            {{ sq.name }}
          </el-button>
        </el-tooltip>
      </div>
    </template>

    <!-- 高级模式：内置 YsAdvancedFilterPanel + 返回简单查询 + 已存查询标签 -->
    <template v-else>
      <div class="yk-filter-panel__mode-bar">
        <el-button link type="primary" @click="switchToSimple">&larr; 简单查询</el-button>
      </div>
      <YsAdvancedFilterPanel
        ref="advancedPanelRef"
        :columns="advancedColumns"
        :option-sources="advancedOptionSources"
        :saved-queries="quickQueriesState"
        @search="onAdvancedSearch"
        @reset="onAdvancedReset"
        @update:saved-queries="onSavedQueriesUpdate"
      />

      <!-- 已存查询标签（在高级查询组件外面，独立一行） -->
      <div v-if="quickQueriesState.length" class="yk-filter-panel__saved">
        <span class="yk-filter-panel__saved-label">已存查询：</span>
        <el-tooltip
          v-for="sq in quickQueriesState"
          :key="sq.id"
          :content="sq.description"
          :disabled="!sq.description"
          placement="top"
        >
          <el-tag
            class="yk-filter-panel__saved-tag"
            effect="plain"
            closable
            @click="applyQuickQuery(sq)"
            @close="removeQuickQuery(sq.id)"
          >
            {{ sq.name }}
          </el-tag>
        </el-tooltip>
      </div>
    </template>
  </div>
</template>

<style scoped>
.yk-filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  padding: 12px 16px;
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
  position: relative; /* 给单行模式 toggle 按钮 absolute 定位做参照 */
}

/* filter items 容器：非单行模式 display:contents 透明，子项直接参与根 flex 布局，
   保持原有 wrap 换行行为不变；单行折叠态由 .is-single-line 规则切为 display:flex 可测量 */
.yk-filter-panel__items {
  display: contents;
}

/* 单行模式 toggle 按钮：右上角 absolute 定位，恒在面板右上角（折叠/展开态都在） */
.yk-filter-panel__toggle {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  padding: 4px;
  height: auto;
  min-height: 0;
}

/* ---- 单行模式（singleLine=true）折叠态 ---- */
/* 根容器允许换行：第一行放 items + actions，快速查询标签独立换行到下一行；
   右侧留 padding 给 toggle 按钮避免遮挡 */
.yk-filter-panel.is-single-line.is-collapsed {
  flex-wrap: wrap;
  padding-right: 40px;
}
/* items 容器切为 flex，与 actions 同行。
   flex:0 1 auto 不主动占满（让 actions 紧随其后而非居右）；
   max-width 默认预留 actions 空间避免首帧 actions 换行，JS 测量后精确覆盖为 容器宽-actions宽-gap。
   overflow:hidden + JS 测量隐藏溢出的 filter item */
.yk-filter-panel.is-single-line.is-collapsed .yk-filter-panel__items {
  display: flex;
  flex-wrap: nowrap;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  gap: 16px;
  max-width: calc(100% - 160px); /* 默认预留 actions 空间，JS 精确覆盖 */
}
/* actions 跟 items 同行（flex-shrink:0 不被压缩）；
   saved 保持默认 width:100%，独立换行到第二行（单行模式下快速查询独立成行） */
.yk-filter-panel.is-single-line.is-collapsed .yk-filter-panel__actions {
  flex-shrink: 0;
}

/* ---- 单行模式展开态：恢复多行 wrap，items 容器回到 display:contents ---- */
.yk-filter-panel.is-single-line:not(.is-collapsed) {
  flex-wrap: wrap;
}
.yk-filter-panel.is-single-line:not(.is-collapsed) .yk-filter-panel__items {
  display: contents;
}

.yk-filter-panel__actions {
  display: flex;
  gap: 8px;
}

/* 高级模式顶部切换条 */
.yk-filter-panel__mode-bar {
  width: 100%;
  display: flex;
  align-items: center;
}

/* 已存/快速查询标签行（独立一行） */
.yk-filter-panel__saved {
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.yk-filter-panel__saved-label {
  font-size: 0.9em;
  color: var(--el-text-color-secondary, #909399);
  white-space: nowrap;
}
.yk-filter-panel__saved-tag {
  cursor: pointer;
}
</style>
