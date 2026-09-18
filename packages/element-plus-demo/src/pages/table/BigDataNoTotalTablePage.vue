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
// 10000 行 + 每次请求 80ms 延迟；totalCount 返回 null，仅靠 hasNext 翻页——
// Table 估算总数（第 1 页 21、第 2 页 41、第 3 页 61……），页码随翻页增长，末页收敛为 10000
const dataFun = delayedPagedData(rows, 80, false);

// ref 直接用 core 的输出契约 TableApi 类型化，不依赖组件 SFC 的 InstanceType
const tableRef = ref<TableApi | null>(null);
const { showSelection } = useSelectionViewer(tableRef);

const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-columns-big-data-no-total",
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
      // action.execute 后组件不会自动 reload，显式刷新让估算总数与列表更新
      void tableRef.value?.reload();
      return Promise.resolve();
    },
  },
);
</script>

<template>
  <DemoPageLayout
    title="大数据全功能表格（10000 行，不返回总条数）"
    hint="同样是 10000 行全功能，但接口不返回 totalCount，只给 hasNext：分页器隐藏「共 N 条」，按「当前 offset + 本页条数 + 1」估算总数驱动页码——初始只有少量页码，往后翻逐步增长，直到最后一页才收敛为真实的 10000。勾选、行操作、列设置、导出与上一页完全一致（列设置 / 导出入口均为外部按钮，经 ref.openConfigDialog / ref.openExportDialog 触发）；导出所有时由于真实总数未知，进度条走 indeterminate 流动动画、不显示百分比，文案为「已加载 N 条（总条数未知）」（靠 hasNext=false 正确终止）。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="showSelection">查看选中</el-button>
      <el-button @click="tableRef?.openConfigDialog()">⚙ 列设置</el-button>
      <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 导出 Excel</el-button>
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
