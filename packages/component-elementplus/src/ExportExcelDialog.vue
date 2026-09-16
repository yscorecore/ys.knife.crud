<script setup lang="ts">
import { type PropType } from "vue";
import type { ExportOption, ExportScope } from "@ys.knife.crud/core";

/**
 * 导出 Excel 对话框组：包含三个相关弹窗
 * 1. 范围选择对话框（多个可用选项时才弹出）
 * 2. 「导出所有」进度对话框（循环拉取数据期间显示，可中途取消）
 * 3. 「导出所有」被取消后的询问（已写入的行可保留为部分文件，或整体丢弃）
 *
 * 三个对话框的可见状态与操作均由外层 useExportExcel 管理，组件只负责展示与事件转发。
 */
defineProps({
  /** 范围选择对话框可见 */
  optionsVisible: { type: Boolean, default: false },
  /** 导出选项列表（范围选择对话框里的按钮组） */
  options: { type: Array as PropType<ExportOption[]>, required: true },
  /** 进度对话框可见 */
  progressVisible: { type: Boolean, default: false },
  /** 已加载数据条数 */
  fetched: { type: Number, default: 0 },
  /** 数据总条数（未知时为 0，进度条按已加载条数滚动到 99% 封顶） */
  total: { type: Number, default: 0 },
  /** 进度百分比 */
  percent: { type: Number, default: 0 },
  /** 取消询问对话框可见 */
  cancelledVisible: { type: Boolean, default: false },
  /** 取消时已写入的数据行数（不含表头） */
  cancelledRows: { type: Number, default: 0 },
});

const emit = defineEmits<{
  /** 点击某个导出范围按钮 */
  (e: "export", scope: ExportScope): void;
  /** 取消「导出所有」 */
  (e: "cancel"): void;
  /** 保留部分文件 */
  (e: "keep"): void;
  /** 丢弃部分文件 */
  (e: "discard"): void;
  /** 关闭范围选择对话框（点遮罩 / ESC） */
  (e: "update:optionsVisible", v: boolean): void;
  /** 关闭进度对话框（正常情况下不可关闭，仅用于内部 el-dialog v-model 同步） */
  (e: "update:progressVisible", v: boolean): void;
  /** 关闭取消询问对话框（选择后由外层关闭） */
  (e: "update:cancelledVisible", v: boolean): void;
}>();
</script>

<template>
  <!-- 范围选择对话框 -->
  <el-dialog
    :model-value="optionsVisible"
    title="导出 Excel"
    width="420px"
    @update:model-value="emit('update:optionsVisible', $event)"
  >
    <div class="export-options">
      <el-button
        v-for="opt in options"
        :key="opt.value"
        class="export-option"
        :data-scope="opt.value"
        :disabled="opt.disabled"
        @click="emit('export', opt.value)"
      >
        {{ opt.label }}
      </el-button>
    </div>
  </el-dialog>

  <!-- 「导出所有」进度对话框 -->
  <el-dialog
    :model-value="progressVisible"
    title="正在导出"
    width="420px"
    :close-on-click-modal="false"
    :show-close="false"
    @update:model-value="emit('update:progressVisible', $event)"
  >
    <el-progress :percentage="percent" />
    <p class="export-progress-text">
      已加载 {{ fetched }}<template v-if="total > 0"> / {{ total }}</template> 条
    </p>
    <template #footer>
      <el-button class="export-cancel" @click="emit('cancel')">取消</el-button>
    </template>
  </el-dialog>

  <!-- 「导出所有」被取消后的询问 -->
  <el-dialog
    :model-value="cancelledVisible"
    title="导出已取消"
    width="420px"
    @update:model-value="emit('update:cancelledVisible', $event)"
  >
    <p class="export-cancelled-text">
      已写入 {{ cancelledRows }} 条数据，是否保留已导出的部分文件？
    </p>
    <template #footer>
      <el-button class="export-discard" @click="emit('discard')">丢弃</el-button>
      <el-button class="export-keep" type="primary" @click="emit('keep')">保留部分文件</el-button>
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
