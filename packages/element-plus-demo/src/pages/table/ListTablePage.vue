<script setup lang="ts">
import { listData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// list：listData 把一个异步 ListFunc（模拟 300ms 延迟的接口）包装成 NewPageFunc，
// 由它完成分页切片
const dataFun = listData<UserRow>(
  () =>
    new Promise<UserRow[]>((resolve) =>
      setTimeout(() => resolve(createRows()), 300),
    ),
);
</script>

<template>
  <DemoPageLayout
    title="异步列表数据表格"
    hint="表头 + listData：listData 把一个异步 ListFunc（模拟 300ms 延迟的接口）包装成 NewPageFunc，由它完成分页切片。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun" />
  </DemoPageLayout>
</template>
