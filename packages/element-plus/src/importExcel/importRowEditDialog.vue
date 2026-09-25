<script setup lang="ts">
import { ref, watch } from "vue";
import type { DataColumn, ImportRow } from "@ys.knife.crud/core";
import { formatCell } from "./formatCell";

/**
 * YsImportRowEditDialog —— 导入失败行的编辑弹窗。
 *
 * 仅负责表单展示与提交：每次打开时按 columns 从 row.data 回填字符串表单；
 * 点「保存并重新校验」时把原始输入交给 saver（由父组件注入，内部走
 * valueMapper + validator）。saver 返回 errors：
 * - 有错误：弹窗不关闭，顶部红色提示全部错误；
 * - 无错误：emit saved（父组件同步勾选/提示）并关闭弹窗。
 */
const props = defineProps<{
  visible: boolean;
  row: ImportRow | null;
  columns: DataColumn[];
  saver: (row: ImportRow, inputs: Record<string, unknown>) => { row: ImportRow; errors: string[] };
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "saved", row: ImportRow): void;
}>();

/** 编辑表单（输入统一为字符串，保存时由 saver 走各列 valueMapper 转换） */
const form = ref<Record<string, string>>({});
/** 本次保存的校验错误（仍有错误时弹窗不关闭，就地提示） */
const errors = ref<string[]>([]);

// 每次打开：按当前行回填表单并清空上一次的错误
watch(
  () => props.visible,
  (visible) => {
    if (!visible || !props.row) return;
    const next: Record<string, string> = {};
    for (const col of props.columns) {
      next[col.name] = formatCell(props.row.data[col.name]);
    }
    form.value = next;
    errors.value = [];
  },
);

function close(): void {
  emit("update:visible", false);
}

function onSave(): void {
  if (!props.row) return;
  const inputs: Record<string, unknown> = {};
  for (const col of props.columns) {
    inputs[col.name] = form.value[col.name] ?? "";
  }
  const { row: updated, errors: nextErrors } = props.saver(props.row, inputs);
  errors.value = nextErrors;
  if (nextErrors.length > 0) return;
  emit("saved", updated);
  emit("update:visible", false);
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="row ? `编辑第 ${row.rowNumber} 行` : '编辑数据行'"
    width="480px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-alert
      v-if="errors.length > 0"
      class="yk-import-row-edit-dialog__alert"
      type="error"
      :closable="false"
      show-icon
    >
      <div v-for="(err, i) in errors" :key="i">{{ err }}</div>
    </el-alert>
    <el-form label-width="92px" @submit.prevent>
      <el-form-item
        v-for="col in columns"
        :key="col.name"
        :label="col.name"
        :required="!col.optional"
      >
        <el-input
          v-model="form[col.name]"
          :placeholder="col.optional ? '可留空' : `请输入${col.name}`"
          @keyup.enter="onSave"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" @click="onSave">保存并重新校验</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.yk-import-row-edit-dialog__alert {
  margin-bottom: 12px;
}
</style>
