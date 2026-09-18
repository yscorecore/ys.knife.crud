<script setup lang="ts">
import { toRef } from "vue";
import { useExportExcel } from "@ys.knife.crud/vue";
import type {
  Column,
  ExportApiFunc as ExportorFunc,
  NewPageFunc,
} from "@ys.knife.crud/core";

/**
 * 导出 Excel 对话框组：包含三个相关弹窗
 * 1. 范围选择对话框（多个可用选项时才弹出）
 * 2. 「导出所有」进度对话框（循环拉取数据期间显示，可中途取消）
 * 3. 「导出所有」被取消后的询问（已写入的行可保留为部分文件，或整体丢弃）
 *
 * 组件自管导出流：内部调用 useExportExcel 拥有全部对话框可见性、进度状态与动作，
 * table.vue 只需传入数据输入并经 ref 调 openExportDialog() 触发导出入口。
 */
const props = defineProps<{
  /** 分页数据源（导出所有时逐页拉取） */
  dataFun: NewPageFunc<unknown>;
  /** 父级是否启用勾选列——决定「导出选中」选项是否出现 */
  exportSelected: boolean;
  /** 导出实现工厂；缺省使用 core 的控制台假实现 */
  exportorFunc?: ExportorFunc;
  /** 表名（用于 sheet 标识与导出文件名；缺省时回退到「数据」/「导出数据」） */
  tableName?: string;
  /** 当前界面显示的列（导出与其所见即所得） */
  columns: Column[];
  /** 当前页行数据 */
  currentRows: Record<string, unknown>[];
  /** checkbox 列当前选中的行（跨页累计） */
  selectedRows: unknown[];
  /** 导出所有时分页拉取的步长（独立于界面分页大小） */
  exportPageSize: number;
  /** 「导出所有」的最大拉取页数（循环次数上限） */
  exportMaxPages: number;
  /** 是否还有下一页（决定「导出所有」选项是否出现） */
  hasMorePage: boolean;
}>();

const {
  exportOptions,
  exportDialogVisible,
  exporting,
  exportFetched,
  exportTotal,
  exportTotalKnown,
  exportPercent,
  exportCancelledVisible,
  exportCancelledRows,
  onExportClick,
  doExport,
  cancelExport,
  keepPartialExport,
  discardPartialExport,
} = useExportExcel({
  props, // reactive — dataFun/exportSelected/exportorFunc 自动追踪
  tableName: toRef(props, "tableName"),
  columns: toRef(props, "columns"),
  currentRows: toRef(props, "currentRows"),
  selectedRows: toRef(props, "selectedRows"),
  exportPageSize: toRef(props, "exportPageSize"),
  exportMaxPages: toRef(props, "exportMaxPages"),
  hasMorePage: toRef(props, "hasMorePage"),
});

defineExpose({ openExportDialog: onExportClick });
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
    <!-- 总条数已知：真实百分比进度条（含百分比文本）；未知：indeterminate 流动动画，
         不显示百分比，具体进度以「已加载 N 条」为准 -->
    <el-progress :percentage="exportPercent" :indeterminate="!exportTotalKnown"
      :show-text="exportTotalKnown" :duration="!exportTotalKnown ? 3 : undefined" />
    <p class="export-progress-text">
      已加载 {{ exportFetched }}<template v-if="exportTotalKnown"> / {{ exportTotal }}</template> 条<template
        v-if="!exportTotalKnown">（总条数未知）</template>
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
