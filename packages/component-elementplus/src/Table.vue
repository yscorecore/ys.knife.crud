<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { Meta, TableProps as CoreTableProps } from "@ys.knife.crud/core";

/**
 * Table 组件的完整 props：在 core 的 TableProps（metaFun）基础上扩展了
 * 数据与交互相关的可选字段。metaFun 为必需，用于异步获取列定义（Meta）。
 */
interface Props extends CoreTableProps {
  /** 行数据，默认空数组 */
  data?: Record<string, unknown>[];
  /** 外部加载态，会和组件内部 meta 加载态合并 */
  loading?: boolean;
  /** 行 key，默认 "id" */
  rowKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  rowKey: "id",
});

const meta = ref<Meta | null>(null);
const metaLoading = ref(false);

/** 按 showForDisplay 过滤、按 displayOrder 升序排序后的列 */
const columns = computed(() => {
  const cols = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
  return [...cols].sort((a, b) => a.displayOrder - b.displayOrder);
});

async function loadMeta(signal?: AbortSignal): Promise<void> {
  metaLoading.value = true;
  try {
    meta.value = await props.metaFun(signal);
  } finally {
    metaLoading.value = false;
  }
}

onMounted(() => loadMeta());
watch(() => props.metaFun, () => loadMeta());

defineExpose({ meta, reload: loadMeta });
</script>

<template>
  <el-table
    v-loading="metaLoading || loading"
    :data="data"
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
