<script setup lang="ts">
import { emptyData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// empty：只加载表头，items 为空数组
const dataFun = emptyData<UserRow>();
</script>

<template>
  <DemoPageLayout
    title="空数据表格"
    hint="只加载表头：metaFun 由 constMetaFunc 提供，dataFun 由 emptyData() 提供（items 为空数组），不显示操作列。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun" />
  </DemoPageLayout>
</template>
