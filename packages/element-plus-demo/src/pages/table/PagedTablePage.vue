<script setup lang="ts">
import { constData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// paged：25 行数据 + pageSize=10，数据超过一页自动出现分页组件
const dataFun = constData(manyRows);
</script>

<template>
  <DemoPageLayout
    title="分页表格"
    hint="25 行数据 + pageSize=10：数据超过一页，表格下方自动显示分页组件；翻页或切换「每页条数」（10 / 20 / 50 / 100）时，Table 会以对应的 limit/offset 重新调用 dataFun，切换条数后回到第一页。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun" :page-size="10" />
  </DemoPageLayout>
</template>
