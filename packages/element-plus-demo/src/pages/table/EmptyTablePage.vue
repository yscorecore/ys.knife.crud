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
    title="空数据表格与自定义空提示"
    hint="只加载表头：metaFun 由 constMetaFunc 提供，dataFun 由 emptyData() 提供（items 为空数组），不显示操作列。表格数据为空时，使用者可用 #empty 插槽自定义提示内容（下方用 el-empty 定制）；不传该插槽时显示 el-table 默认的「暂无数据」。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun">
      <template #empty>
        <el-empty description="自定义空提示：暂无符合条件的用户数据" :image-size="80">
          <el-button type="primary" @click="$emit('back')">去其他页面看看</el-button>
        </el-empty>
      </template>
    </ys-table>
  </DemoPageLayout>
</template>
