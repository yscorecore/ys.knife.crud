<script setup lang="ts">
import { ref } from "vue";
import { constActions, type RowActionsFunc, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import { ElMessage } from "element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createBigRows, delayedPagedData, metaFun, type UserRow } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";
import { useSelectionViewer } from "../shared/useSelectionViewer";

defineEmits<{
  (e: "back"): void;
}>();

// 数据在 setup 内创建：删除 splice 后 Table reload 能看到最新数据，且不污染其他演示
const rows = createBigRows();
// 10000 行 + 每次请求 50ms 延迟；返回真实 totalCount：Total 10000、500 页一次到位
const dataFun = delayedPagedData(rows, 50, true);

// ref 直接用 core 的输出契约 TableApi 类型化，不依赖组件 SFC 的 InstanceType
const tableRef = ref<TableApi | null>(null);
const { showSelection } = useSelectionViewer(tableRef);

const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-columns-big-data",
);

const exportorFunc = createExcelJsExportApiFunc();

// 全功能行操作：查看（恒可见可用）、编辑（age>=20 才可用）、删除（id=1 受保护不显示）
const rowActionsFunc: RowActionsFunc<UserRow> = constActions<UserRow>(
  {
    name: "view",
    desc: "查看",
    execute: (item) => {
      ElMessage.info(`查看：${item.name}（${item.email}，${item.age} 岁）`);
      return Promise.resolve();
    },
  },
  {
    name: "edit",
    desc: "编辑",
    enable: (item) => item.age >= 20,
    execute: (item) => {
      ElMessage.info(`编辑：${item.name}`);
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
      // action.execute 后组件不会自动 reload，显式刷新让总数与列表更新
      void tableRef.value?.reload();
      return Promise.resolve();
    },
  },
);
</script>

<template>
  <DemoPageLayout
    title="大数据全功能表格（10000 行，显示总条数）"
    hint="10000 行数据 + 50ms 请求延迟，接口返回真实 totalCount：分页器直接显示精确的 Total 10000 与 500 个页码。全部功能开启——跨页勾选（reserve-selection，翻页不丢，工具栏可「查看选中」）、行操作（查看恒可用；编辑在 age&lt;20 时禁用；id=1 受保护不显示删除，删除后显式 reload，总数实时减少）、列设置（localStorage 持久化，表格右上角「⚙ 列设置」入口打开）、导出 Excel（右上角「⬇ 导出 Excel」入口；选中 / 当前页 / 所有；导出所有按 500 条/次流式拉取 20 次，进度条显示精确百分比与「已加载 N / 10000」分母）。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="showSelection">查看选中</el-button>
    </template>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="20"
      show-checkbox
      show-custom-config
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
      show-export-excel
      :export-page-size="500"
      :exportor-func="exportorFunc"
      :row-actions-func="rowActionsFunc"
    />
  </DemoPageLayout>
</template>
