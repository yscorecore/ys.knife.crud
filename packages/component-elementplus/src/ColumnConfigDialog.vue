<script setup lang="ts">
import { type PropType } from "vue";

/** 列设置面板里单个可编辑列的草稿（与 useCustomConfig.DraftColumn 一致） */
export interface DraftColumn {
  propertyPath: string;
  displayName: string;
  visible: boolean;
  width: string;
}

/**
 * 列设置对话框：勾选显隐、上移/下移调顺序、输入框调列宽。
 *
 * 可见状态与草稿由外层 useCustomConfig 管理，组件只负责展示与事件转发；
 * 草稿变更通过 v-model 双向绑定回传外层，保存/取消由外层决定如何处理。
 */
defineProps({
  /** 对话框可见 */
  visible: { type: Boolean, default: false },
  /** 列草稿（双向绑定，外层在保存时根据最新草稿写入 CustomConfig） */
  draftColumns: { type: Array as PropType<DraftColumn[]>, required: true },
});

const emit = defineEmits<{
  /** 关闭对话框（点遮罩 / ESC / 取消按钮） */
  (e: "update:visible", v: boolean): void;
  /** 草稿变更（v-model:draftColumns 同步） */
  (e: "update:draftColumns", v: DraftColumn[]): void;
  /** 调整草稿中某列的顺序（上移/下移） */
  (e: "move", index: number, delta: number): void;
  /** 保存列设置 */
  (e: "save"): void;
}>();
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="列设置"
    width="480px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-for="(d, i) in draftColumns" :key="d.propertyPath" class="col-config-row">
      <el-checkbox v-model="d.visible" class="col-config-name">{{ d.displayName }}</el-checkbox>
      <el-input v-model="d.width" class="col-config-width" placeholder="宽度(如 120)" size="small" />
      <el-button link type="primary" :disabled="i === 0" @click="emit('move', i, -1)">上移</el-button>
      <el-button
        link
        type="primary"
        :disabled="i === draftColumns.length - 1"
        @click="emit('move', i, 1)"
      >
        下移
      </el-button>
    </div>
    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" class="col-config-save" @click="emit('save')">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.col-config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
.col-config-name {
  flex: 1;
  margin-right: 0;
}
.col-config-width {
  width: 120px;
}
</style>
