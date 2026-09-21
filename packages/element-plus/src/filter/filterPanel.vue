<script setup lang="ts">
import { computed, onMounted, provide, ref } from "vue";
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

/* ---------------- 暴露 API ---------------- */
defineExpose({
  filter: currentFilter,
  reset: onReset,
  mode,
});
</script>

<template>
  <div class="yk-filter-panel" @keydown.enter="onRootEnter">
    <!-- 简单模式：默认插槽 + 查询/重置/高级查询切换 + 快速查询标签 -->
    <template v-if="mode === 'simple'">
      <slot />
      <div
        v-if="showSearch || showReset || enableAdvancedFilter"
        class="yk-filter-panel__actions"
      >
        <el-button v-if="showSearch" type="primary" @click="onSearch">{{ searchButtonText }}</el-button>
        <el-button v-if="showReset" @click="onReset">{{ resetButtonText }}</el-button>
        <el-button v-if="enableAdvancedFilter" link type="primary" @click="switchToAdvanced">
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
