<script setup lang="ts">
import { toRef } from "vue";
import { useExportExcel } from "@ys.knife.crud/vue";
import type {
  Column,
  ExportApiFunc,
  Meta,
  PageFunc,
} from "@ys.knife.crud/core";

/**
 * 导出 Excel 对话框组：包含三个相关弹窗
 * 1. 范围选择对话框（多个可用选项时才弹出）
 * 2. 「导出所有」进度对话框（循环拉取数据期间显示，可中途取消）
 * 3. 「导出所有」被取消后的询问（已写入的行可保留为部分文件，或整体丢弃）
 *
 * 组件自管导出流：内部调用 useExportExcel 拥有全部对话框可见性、进度状态与动作，
 * Table.vue 只需传入数据输入并经 ref 调 trigger() 触发导出入口。
 */
const props = defineProps<{
  /** 分页数据源（导出所有时逐页拉取） */
  dataFun: PageFunc<unknown>;
  /** 是否有勾选列（决定「导出选中」选项是否出现） */
  showCheckbox: boolean;
  /** 导出实现工厂；缺省使用 core 的控制台假实现 */
  exportApiFunc?: ExportApiFunc;
  /** 列元数据（表名用于 sheet 标识与导出文件名） */
  meta: Meta | null;
  /** 当前界面显示的列（导出与其所见即所得） */
  columns: Column[];
  /** 当前页行数据 */
  rows: Record<string, unknown>[];
  /** checkbox 列当前选中的行（跨页累计） */
  selectedRows: unknown[];
  /** 数据总条数 */
  total: number;
  /** 导出所有时分页拉取的步长（独立于界面分页大小） */
  exportPageSize: number;
  /** 分页组件是否显示（决定「导出所有」选项是否出现） */
  showPagination: boolean;
}>();

const {
  exportOptions,
  exportDialogVisible,
  exporting,
  exportFetched,
  exportTotal,
  exportPercent,
  exportCancelledVisible,
  exportCancelledRows,
  onExportClick,
  doExport,
  cancelExport,
  keepPartialExport,
  discardPartialExport,
} = useExportExcel({
  props, // reactive — dataFun/showCheckbox/exportApiFunc 自动追踪
  meta: toRef(props, "meta"),
  columns: toRef(props, "columns"),
  rows: toRef(props, "rows"),
  selectedRows: toRef(props, "selectedRows"),
  total: toRef(props, "total"),
  exportPageSize: toRef(props, "exportPageSize"),
  showPagination: toRef(props, "showPagination"),
});

defineExpose({ trigger: onExportClick });
</script>

<template>
  <!-- 范围选择对话框 -->
  <el-dialog
    v-model="exportDialogVisible"
    title="导出 Excel"
    width="420px"
  >
    <div class="export-options">
      <el-button
        v-for="opt in exportOptions"
        :key="opt.value"
        class="export-option"
        :data-scope="opt.value"
        :disabled="opt.disabled"
        @click="doExport(opt.value)"
      >
        {{ opt.label }}
      </el-button>
    </div>
  </el-dialog>

  <!-- 「导出所有」进度对话框 -->
  <el-dialog
    v-model="exporting"
    title="正在导出"
    width="420px"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <el-progress :percentage="exportPercent" />
    <p class="export-progress-text">
      已加载 {{ exportFetched }}<template v-if="exportTotal > 0"> / {{ exportTotal }}</template> 条
    </p>
    <template #footer>
      <el-button class="export-cancel" @click="cancelExport">取消</el-button>
    </template>
  </el-dialog>

  <!-- 「导出所有」被取消后的询问 -->
  <el-dialog
    v-model="exportCancelledVisible"
    title="导出已取消"
    width="420px"
  >
    <p class="export-cancelled-text">
      已写入 {{ exportCancelledRows }} 条数据，是否保留已导出的部分文件？
    </p>
    <template #footer>
      <el-button class="export-discard" @click="discardPartialExport">丢弃</el-button>
      <el-button class="export-keep" type="primary" @click="keepPartialExport">保留部分文件</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.export-options {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.export-options .export-option {
  margin-left: 0;
}
.export-progress-text {
  margin: 10px 0 0;
  color: #666;
  font-size: 0.92em;
  text-align: center;
}
</style>
