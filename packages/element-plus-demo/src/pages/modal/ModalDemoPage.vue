<script setup lang="ts">
import { openModal, openDialog, type ModalAction } from "@ys-knife-crud/element-plus";
import { ElMessage } from "element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import UserEditForm from "./UserEditForm.vue";
import SelfFooterForm from "./SelfFooterForm.vue";
import TableInDialog from "./TableInDialog.vue";
import ImportExcelInDialog from "./ImportExcelInDialog.vue";

defineEmits<{
  (e: "back"): void;
}>();

/**
 * openModal 演示：无需 template 声明 <el-dialog>，在事件处理器里直接弹出任意 SFC。
 *
 * 场景 1（actions 数组）：底部按钮由 actions 数据驱动渲染（结构与 TableAction 同构），
 *   execute(handle) 接收弹窗句柄，需要关闭时显式调用 handle.close()；
 *   返回 Promise 期间该按钮 loading、其余按钮禁用、右上角 ✕ 隐藏；
 *   校验失败时不调用 close，弹窗保持打开。
 *
 * 场景 2（不传 actions）：底部不渲染按钮，内容组件自渲染按钮 + 自控提交逻辑，
 *   成功后 emit("close") 让外壳销毁弹窗。
 *
 * 场景 4（openDialog）：openModal 的简化封装，默认提供「取消 / 确定」按钮，
 *   只需传 onConfirm（返回 false 不关闭，其他值关闭）。
 */

/** 编辑用户弹窗的通用动作组：取消 + 保存（异步校验） */
function userEditActions(): ModalAction<typeof UserEditForm>[] {
  return [
    { name: "cancel", desc: "取消", execute: (handle) => handle.close() },
    {
      name: "save",
      desc: "保存",
      type: "primary",
      // 第二个参数 instance 由框架传入当前内容组件实例，类型自动推断为
      // InstanceType<typeof UserEditForm>（非 null），直接调用 expose 的方法即可
      execute: async (handle, form) => {
        // 校验失败 → 不调用 close，弹窗保持打开
        const ok = await form.validate().catch(() => false);
        if (!ok) return;
        // 模拟保存（800ms，期间保存按钮 loading、取消与 ✕ 禁用/隐藏）
        await new Promise((r) => setTimeout(r, 800));
        console.log("[modal demo] saved:", form.getData());
        ElMessage.success(`已保存：${form.getData().name}`);
        handle.close();
      },
    },
  ];
}

function openWithActions(): void {
  openModal({
    title: "编辑用户（actions 取消/保存）",
    width: "520px",
    component: UserEditForm,
    props: { initialName: "Alice", initialEmail: "alice@example.com" },
    actions: userEditActions(),
    onCancel: () => console.log("[modal demo] cancelled via ✕"),
    onClosed: () => console.log("[modal demo] dialog destroyed"),
  });
}

function openWithoutActions(): void {
  openModal({
    title: "编辑用户（自渲染按钮）",
    width: "520px",
    component: SelfFooterForm,
    props: { initialName: "Bob" },
  });
}

function openWithListeners(): void {
  openModal({
    title: "监听子组件事件（props.onXxx）",
    width: "520px",
    component: UserEditForm,
    props: {
      initialName: "Carol",
      initialEmail: "carol@example.com",
      // Vue 3 事件监听也是 props（onXxx 命名）：组件 emit("custom", payload) 即触发。
      // UserEditForm 当前只 emit close，这里仅演示 onXxx 的透传机制
      onCustom: (payload: unknown) => console.log("[modal demo] custom event:", payload),
    },
    actions: [{ name: "close", desc: "关闭", type: "primary", execute: (handle) => handle.close() }],
  });
}

function openWithDialog(): void {
  openDialog({
    title: "编辑用户（openDialog 内置取消/确定）",
    width: "520px",
    component: UserEditForm,
    props: { initialName: "Frank", initialEmail: "frank@example.com" },
    onConfirm: async (_handle, form) => {
      // form 自动推断为 InstanceType<typeof UserEditForm>（非 null），无需断言、无需判空
      const ok = await form.validate().catch(() => false);
      if (!ok) return false;          // 校验失败 → 返回 false 不关闭
      await new Promise((r) => setTimeout(r, 800));
      ElMessage.success(`已保存：${form.getData().name}`);
      // 返回 undefined → 关闭弹窗
    },
  });
}

function openMaximizable(): void {
  const handle = openModal({
    title: "可最大化弹窗（点标题栏 ⛶ 切换）",
    width: "520px",
    component: UserEditForm,
    props: { initialName: "Dave", initialEmail: "dave@example.com" },
    maximizable: true,
    actions: userEditActions(),
  });
  console.log("[modal demo] initial maximized:", handle.isMaximized());
}

function openMaximizedByDefault(): void {
  openModal({
    title: "打开即最大化（defaultMaximized）",
    component: UserEditForm,
    props: { initialName: "Eve", initialEmail: "eve@example.com" },
    maximizable: true,
    defaultMaximized: true,
    actions: userEditActions(),
  });
}

/** openDialog 内嵌 YsTablePage：弹窗里直接渲染完整的查询+命令+表格三合一 */
function openDialogWithTable(): void {
  openDialog({
    title: "弹窗内表格（YsTablePage）",
    width: "900px",
    component: TableInDialog,
    maximizable: true,
    // 表格场景确定按钮直接关闭；如需取选中行，可通过 ref 调用 table.getSelectedRows()
  });
}

/** openDialog 内嵌 YsImportExcel：弹窗里直接渲染 Excel 导入组件 */
function openDialogWithImportExcel(): void {
  openDialog({
    title: "弹窗内导入 Excel（YsImportExcel）",
    width: "900px",
    component: ImportExcelInDialog,
    maximizable: true,
  });
}
</script>

<template>
  <DemoPageLayout
    title="代码式弹窗（openModal）"
    hint="无需 template 声明 <el-dialog v-model>，在事件处理器里直接弹出任意 SFC。底部按钮由 actions 数组数据驱动（不传则不渲染，由内容组件自行决定按钮与关闭时机）；execute(handle) 中显式调用 handle.close() 关闭弹窗，执行期间按钮自动 loading。所有弹窗继承 AppContext（inject/i18n/全局组件可用），关闭动画结束后自动销毁 DOM。"
    @back="$emit('back')"
  >
    <div class="demo-modal-actions">
      <el-button type="primary" @click="openWithActions">
        ① actions 数组（取消/保存，异步校验）
      </el-button>
      <el-button @click="openWithoutActions">
        ② 不传 actions（自渲染按钮）
      </el-button>
      <el-button @click="openWithListeners">
        ③ props.onXxx 透传事件
      </el-button>
      <el-button type="primary" plain @click="openWithDialog">
        ④ openDialog（内置取消/确定 + onConfirm）
      </el-button>
      <el-button type="success" @click="openMaximizable">
        ⑤ 可最大化（标题栏按钮切换）
      </el-button>
      <el-button type="warning" @click="openMaximizedByDefault">
        ⑥ 打开即最大化（defaultMaximized）
      </el-button>
      <el-button type="primary" @click="openDialogWithTable">
        ⑦ openDialog 内嵌 YsTablePage
      </el-button>
      <el-button type="success" @click="openDialogWithImportExcel">
        ⑧ openDialog 内嵌 YsImportExcel
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
