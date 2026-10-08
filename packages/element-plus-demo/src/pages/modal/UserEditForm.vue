<script setup lang="ts">
import { reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";

/**
 * openModal actions 场景的内容组件：只渲染表单本身，取消/保存按钮由 actions 数组提供。
 * 校验与取值经 defineExpose 暴露给 actions.execute(handle)（handle.getContentInstance()）；
 * 组件自身不需要 emit("close")——关闭由动作内 handle.close() 控制。
 */
const props = defineProps<{
  initialName?: string;
  initialEmail?: string;
}>();

const formRef = ref<FormInstance>();
const form = reactive({
  name: props.initialName ?? "",
  email: props.initialEmail ?? "",
});

const rules: FormRules = {
  name: [
    { required: true, message: "请输入姓名", trigger: "blur" },
    { min: 2, max: 20, message: "长度 2-20", trigger: "blur" },
  ],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "邮箱格式不正确", trigger: "blur" },
  ],
};

defineExpose({
  /** el-form 校验；校验失败 reject（formRef 未挂载视为通过） */
  validate: (): Promise<boolean> => formRef.value?.validate() ?? Promise.resolve(true),
  /** 读取当前表单数据 */
  getData: () => ({ ...form }),
});
</script>

<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="72px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.name" placeholder="请输入姓名" />
    </el-form-item>
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="form.email" placeholder="name@example.com" />
    </el-form-item>
  </el-form>
</template>
