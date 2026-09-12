<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType } from "vue";
import type { Action, Meta, PagedList, TableProps as CoreTableProps } from "@ys.knife.crud/core";

/**
 * Table 组件的 props = core 的 TableProps（metaFun + dataFun），
 * 另加展示相关的可选字段。
 * - metaFun：异步获取列定义（Meta）
 * - dataFun：异步获取分页数据（PagedList），表格渲染其 items
 *
 * 注意：这里刻意用「运行时 props 声明 + PropType」，而不是
 * `defineProps<Props extends CoreTableProps>()` 类型语法。
 * 原因：SFC 编译器把类型转成运行时 props 声明时，对跨包 re-export 的类型
 * （如 core 从 ys.knife.query.js 转出的 PageFunc）解析失败时会静默丢弃
 * 该 prop 成员，导致父组件传入的 dataFun 变成 fallthrough attribute，
 * 组件内 props.dataFun 为 undefined。运行时声明不依赖类型静态分析，无此问题。
 */
const props = defineProps({
  metaFun: { type: Function as PropType<CoreTableProps["metaFun"]>, required: true },
  dataFun: { type: Function as PropType<CoreTableProps["dataFun"]>, required: true },
  /** 可选。存在时在每一行最后一列显示可执行的操作 */
  rowActionsFunc: { type: Function as PropType<NonNullable<CoreTableProps["rowActionsFunc"]>>, required: false },
  /** 首次请求的每页条数（分页 UI 暂未实现），默认 20 */
  pageSize: { type: Number, default: 20 },
  /** 外部加载态，会和组件内部加载态合并 */
  loading: { type: Boolean, default: false },
  /** 行 key，默认 "id" */
  rowKey: { type: String, default: "id" },
});

const meta = ref<Meta | null>(null);
const paged = ref<PagedList<unknown> | null>(null);
const actions = ref<Action<unknown>[]>([]);
const metaLoading = ref(false);
const dataLoading = ref(false);
const actionsLoading = ref(false);

/** 按 showForDisplay 过滤、按 displayOrder 升序排序后的列 */
const columns = computed(() => {
  const cols = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
  return [...cols].sort((a, b) => a.displayOrder - b.displayOrder);
});

/** 当前页行数据，来自 dataFun 返回的 PagedList.items */
const rows = computed(() => (paged.value?.items ?? []) as Record<string, unknown>[]);

async function loadMeta(signal?: AbortSignal): Promise<void> {
  metaLoading.value = true;
  try {
    meta.value = await props.metaFun(signal);
  } finally {
    metaLoading.value = false;
  }
}

async function loadData(signal?: AbortSignal): Promise<void> {
  dataLoading.value = true;
  try {
    paged.value = await props.dataFun({ limit: props.pageSize, offset: 0 }, signal);
  } finally {
    dataLoading.value = false;
  }
}

async function loadActions(signal?: AbortSignal): Promise<void> {
  if (!props.rowActionsFunc) {
    actions.value = [];
    return;
  }
  actionsLoading.value = true;
  try {
    actions.value = await props.rowActionsFunc(signal);
  } finally {
    actionsLoading.value = false;
  }
}

/** 该行可见的操作（action.show 缺省视为可见） */
function visibleActions(row: unknown): Action<unknown>[] {
  return actions.value.filter((a) => a.show?.(row) ?? true);
}

/** 该操作对该行是否可用（action.enable 缺省视为可用） */
function isEnabled(action: Action<unknown>, row: unknown): boolean {
  return action.enable?.(row) ?? true;
}

/** 执行操作，完成后刷新数据（增删改类操作需要看到最新列表） */
async function runAction(action: Action<unknown>, row: unknown): Promise<void> {
  await action.execute(row);
  await loadData();
}

/** 重新加载元数据、数据与行操作 */
function reload(): void {
  loadMeta();
  loadData();
  loadActions();
}

onMounted(reload);
watch(() => props.metaFun, () => loadMeta());
watch(() => props.dataFun, () => loadData());
watch(() => props.rowActionsFunc, () => loadActions());

defineExpose({ meta, paged, actions, reload });
</script>

<template>
  <el-table
    v-loading="metaLoading || dataLoading || actionsLoading || loading"
    :data="rows"
    :row-key="rowKey"
    border
  >
    <el-table-column
      v-for="col in columns"
      :key="col.propertyPath"
      :prop="col.propertyPath"
      :label="col.displayName"
      show-overflow-tooltip
    />
    <!-- 存在行操作时追加最后一列 -->
    <el-table-column v-if="actions.length > 0" label="操作" fixed="right">
      <template #default="{ row }">
        <el-button
          v-for="action in visibleActions(row)"
          :key="action.name"
          link
          type="primary"
          :disabled="!isEnabled(action, row)"
          @click="runAction(action, row)"
        >
          {{ action.desc }}
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
