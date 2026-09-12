<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType } from "vue";
import type { Meta, PagedList, TableProps as CoreTableProps } from "@ys.knife.crud/core";

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
  /** 首次请求的每页条数（分页 UI 暂未实现），默认 20 */
  pageSize: { type: Number, default: 20 },
  /** 外部加载态，会和组件内部加载态合并 */
  loading: { type: Boolean, default: false },
  /** 行 key，默认 "id" */
  rowKey: { type: String, default: "id" },
});

const meta = ref<Meta | null>(null);
const paged = ref<PagedList<unknown> | null>(null);
const metaLoading = ref(false);
const dataLoading = ref(false);

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

/** 重新加载元数据与数据 */
function reload(): void {
  loadMeta();
  loadData();
}

onMounted(reload);
watch(() => props.metaFun, () => loadMeta());
watch(() => props.dataFun, () => loadData());

defineExpose({ meta, paged, reload });
</script>

<template>
  <el-table
    v-loading="metaLoading || dataLoading || loading"
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
  </el-table>
</template>
