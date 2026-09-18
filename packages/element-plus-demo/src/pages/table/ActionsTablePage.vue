<script setup lang="ts">
import { constActions, constData, type RowActionsFunc } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { ElMessage } from "element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// 数据在 setup 内创建：删除 splice 后 Table reload 能看到最新数据，且不污染其他演示
const rows = createRows();
const dataFun = constData(rows);

// 最后一列显示「编辑 / 删除」；首行（Alice）受保护，不显示删除按钮
const rowActionsFunc: RowActionsFunc<UserRow> = constActions<UserRow>(
  {
    name: "edit",
    desc: "编辑",
    execute: (item) => {
      ElMessage.info(`编辑：${item.name}（${item.email}）`);
      return Promise.resolve();
    },
  },
  {
    name: "delete",
    desc: "删除",
    show: (item) => item.id !== 1,
    execute: (item) => {
      const i = rows.findIndex((r) => r.id === item.id);
      if (i >= 0) rows.splice(i, 1);
      ElMessage.success(`已删除：${item.name}`);
      return Promise.resolve();
    },
  },
);
</script>

<template>
  <DemoPageLayout
    title="带行操作的表格"
    hint="表头 + const 数据 + 行操作：rowActionsFunc 由 constActions 提供，最后一列显示「编辑 / 删除」；首行因 show 条件不显示「删除」，删除后 Table 自动 reload。"
    @back="$emit('back')"
  >
    <ys-table
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :row-actions-func="rowActionsFunc"
    />
  </DemoPageLayout>
</template>
