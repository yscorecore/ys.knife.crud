<script setup lang="ts">
import { constData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(createRows());

// 列设置持久化到 localStorage，刷新页面后仍生效（各演示模式用独立 key）
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-columns",
);
</script>

<template>
  <DemoPageLayout
    title="自定义列表格"
    hint="showCustomConfig 开启后表格右上出现「⚙ 列设置」：可勾选列的显隐、用上移/下移调整顺序、输入列宽，保存后立即生效并经 localStorage 持久化（刷新页面仍在）。候选列来自 meta 中 showForDisplay=true 的列，隐藏列不会出现。"
    @back="$emit('back')"
  >
    <ys-table
      :meta-fun="metaFun"
      :data-fun="dataFun"
      show-custom-config
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
    />
  </DemoPageLayout>
</template>
