<script setup lang="ts">
import { constData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// const：表头 + 固定数据，返回固定数组的分页切片
const dataFun = constData(createRows());
</script>

<template>
  <DemoPageLayout
    title="固定数据表格"
    hint="表头 + const 数据：dataFun 由 constData(rows) 提供，返回固定数组的分页切片，不显示操作列。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun" />
  </DemoPageLayout>
</template>
