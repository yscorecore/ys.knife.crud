<script setup lang="ts">
import { reactive, ref } from "vue";
import type { FormInstance } from "element-plus";

/**
 * openModal 不传 actions 场景的内容组件：底部按钮区不渲染，按钮自渲染、提交逻辑自控，
 * 成功后 emit("close") 让 openModal 外壳销毁弹窗。
 * 适用于多步表单、按钮文案随状态变化、提交后还要做其他事（如 ElMessage）的场景。
 */
const props = defineProps<{
  initialName?: string;
}>();

const emit = defineEmits<{
  /** 注入的关闭钩子：openModal 自动监听 */
  (e: "close"): void;
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  name: props.initialName ?? "",
  note: "",
});

async function submit(): Promise<void> {
  const ok = await formRef.value?.validate().catch(() => false);
  if (!ok) return;
  submitting.value = true;
  try {
    // 模拟保存请求（500ms）
    await new Promise((r) => setTimeout(r, 500));
    console.log("[modal demo] saved:", form);
    emit("close");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-form ref="formRef" :model="form" label-width="72px">
    <el-form-item label="姓名" prop="name" :rules="[{ required: true, message: '请输入姓名' }]">
      <el-input v-model="form.name" />
    </el-form-item>
    <el-form-item label="备注" prop="note">
      <el-input v-model="form.note" type="textarea" :rows="3" />
    </el-form-item>
    <div class="modal-own-footer">
      <el-button :disabled="submitting" @click="emit('close')">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存并关闭</el-button>
    </div>
  </el-form>
</template>

<style scoped>
.modal-own-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
