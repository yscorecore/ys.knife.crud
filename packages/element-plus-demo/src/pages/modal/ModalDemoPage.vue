<script setup lang="ts">
import { openModal } from "@ys-knife-crud/element-plus";
import { ElMessage } from "element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import UserEditForm from "./UserEditForm.vue";
import SelfFooterForm from "./SelfFooterForm.vue";

defineEmits<{
  (e: "back"): void;
}>();

/**
 * openModal 演示：无需 template 声明 <el-dialog>，在事件处理器里直接弹出任意 SFC。
 *
 * 场景 1（内置 footer）：弹窗外壳提供确定/取消按钮，onConfirm 返回 Promise 期间
 *   确定按钮 loading、取消与 ✕ 禁用；返回 false 保持打开（校验失败）。
 *
 * 场景 2（showFooter: false）：内容组件自渲染按钮 + 自控提交逻辑，
 *   成功后 emit("close") 让外壳销毁弹窗。
 */

function openWithFooter(): void {
  const handle = openModal({
    title: "编辑用户（内置确定/取消）",
    width: "520px",
    component: UserEditForm,
    props: { initialName: "Alice", initialEmail: "alice@example.com" },
    onConfirm: async () => {
      const instance = handle.getContentInstance() as InstanceType<typeof UserEditForm> | null;
      if (!instance) return false;
      // 校验失败 → 返回 false 保持弹窗打开
      const ok = await instance.validate().catch(() => false);
      if (!ok) return false;
      // 模拟保存（800ms，期间确定按钮 loading）
      await new Promise((r) => setTimeout(r, 800));
      console.log("[modal demo] saved:", instance.getData());
      ElMessage.success(`已保存：${instance.getData().name}`);
      // 返回 undefined 关闭弹窗
    },
    onCancel: () => ElMessage.info("已取消"),
    onClosed: () => console.log("[modal demo] dialog destroyed"),
  });
}

function openWithoutFooter(): void {
  openModal({
    title: "编辑用户（自渲染按钮）",
    width: "520px",
    component: SelfFooterForm,
    props: { initialName: "Bob" },
    showFooter: false,
  });
}

function openWithListeners(): void {
  openModal({
    title: "监听子组件事件（listeners）",
    width: "520px",
    component: UserEditForm,
    props: { initialName: "Carol", initialEmail: "carol@example.com" },
    listeners: {
      // UserEditForm 当前只 emit close，这里演示其他事件的透传机制
      onCustom: (payload: unknown) => console.log("[modal demo] custom event:", payload),
    },
    onConfirm: async () => {
      ElMessage.success("确定点击，listeners 仅透传不拦截");
    },
  });
}
</script>

<template>
  <DemoPageLayout
    title="代码式弹窗（openModal）"
    hint="无需 template 声明 <el-dialog v-model>，在事件处理器里直接弹出任意 SFC。三种用法：①内置确定/取消按钮 + onConfirm 异步校验；②showFooter=false 由内容组件自渲染按钮 + 自提交；③listeners 透传子组件自定义事件。所有弹窗继承 AppContext（inject/i18n/全局组件可用），关闭动画结束后自动销毁 DOM。"
    @back="$emit('back')"
  >
    <div class="demo-modal-actions">
      <el-button type="primary" @click="openWithFooter">
        ① 内置确定/取消（异步校验）
      </el-button>
      <el-button @click="openWithoutFooter">
        ② showFooter=false（自渲染按钮）
      </el-button>
      <el-button @click="openWithListeners">
        ③ listeners 透传事件
      </el-button>
      <el-alert
        class="demo-modal-tip"
        type="info"
        :closable="false"
        show-icon
        title="打开 DevTools Console 观察生命周期日志（saved / cancelled / destroyed）"
      />
    </div>
  </DemoPageLayout>
</template>

<style scoped>
.demo-modal-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 24px;
}
.demo-modal-tip {
  margin-top: 12px;
  width: auto;
}
</style>
