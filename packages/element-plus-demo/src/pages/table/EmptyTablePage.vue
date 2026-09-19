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
    hint="只加载表头：metaFun 由 constMetaFunc 提供，dataFun 由 emptyData() 提供（items 为空数组），不显示操作列。#empty 插槽在表格 / 卡片 / 列表三种视图下共享——数据为空且提供了插槽时，三种视图都渲染下方自定义空提示；可通过右上角切换控件切换视图对比效果。不传该插槽时，表格视图回落 el-table 默认的「暂无数据」，卡片 / 列表视图回落 el-empty「暂无数据」。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun" :view-switch-modes="['table', 'card', 'list']">
      <template #empty>
        <el-empty description="自定义空提示：暂无符合条件的用户数据" :image-size="80">
          <el-button type="primary" @click="$emit('back')">去其他页面看看</el-button>
        </el-empty>
      </template>
    </ys-table>
  </DemoPageLayout>
</template>
