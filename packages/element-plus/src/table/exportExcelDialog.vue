<script setup lang="ts">
import { computed, toRef } from "vue";
import { useExportExcel } from "@ys.knife.crud/vue";
import type {
  Column,
  ExportApiFunc as ExportorFunc,
  PageFunc,
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
  dataFun: PageFunc<unknown>;
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
  /** 数据总条数（驱动进度条初始分母；响应中带回 totalCount 时会被修正） */
  total: number;
  /** 导出所有时分页拉取的步长（独立于界面分页大小） */
  exportPageSize: number;
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
  exportEtaSeconds,
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
  total: toRef(props, "total"),
  exportPageSize: toRef(props, "exportPageSize"),
  hasMorePage: toRef(props, "hasMorePage"),
});

/** 剩余时间文案：不足 1 分钟显示「N 秒」，否则「M 分 S 秒」；总数未知时不显示 */
const exportEtaText = computed(() => {
  const s = exportEtaSeconds.value;
  if (s == null) return null;
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m} 分 ${r} 秒` : `${m} 分`;
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
    <!-- 进度：总数已知 → 精确百分比 + 「已加载 N / M 条」；
         未知（接口只给 hasNext）→ 99% 封顶、不带分母。已加载至少一页且总数已知时，
         按当前速率外推预计剩余时间（随节拍持续倒数，加载完成后隐藏） -->
    <el-progress :percentage="exportPercent" />
    <p class="export-progress-text">
      已加载 {{ exportFetched }}<template v-if="exportTotalKnown"> / {{ exportTotal }}</template> 条<template v-if="exportEtaText">，预计剩余约 {{ exportEtaText }}</template>
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
