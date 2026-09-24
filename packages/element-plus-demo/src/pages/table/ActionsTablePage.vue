<script setup lang="ts">
import { h, ref, type FunctionalComponent } from "vue";
import { constActions, constData, type RowActionsFunc, type ViewMode } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { ElMessage } from "element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

/**
 * 行操作图标工厂：14px 线性风格（Feather 风格），stroke 跟随按钮文字颜色（currentColor）。
 * Action.icon 类型为 unknown，渲染层用 <component :is> 兼容函数式组件 / VNode。
 * 这里用函数式组件——返回单个 svg VNode，class 经 fallthrough 落到 svg 根元素。
 */
function makeIcon(paths: string[]): FunctionalComponent {
  return () =>
    h(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: 14,
        height: 14,
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
      paths.map((d) => h("path", { d })),
    );
}

// 编辑（铅笔）、删除（垃圾桶）图标
const EditIcon = makeIcon(["M12 20h9", "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"]);
const DeleteIcon = makeIcon([
  "M3 6h18",
  "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
]);

// 数据在 setup 内创建：删除 splice 后 Table reload 能看到最新数据，且不污染其他演示
const rows = createRows();
const dataFun = constData(rows);

// 视图切换入口由外部 radio 驱动（v-model:view-mode 受控）
const viewMode = ref<ViewMode>("table");

// 最后一列显示「编辑 / 删除」；首行（Alice）受保护，不显示删除按钮。
// icon 演示：编辑用铅笔图标、删除用垃圾桶图标（type: danger 红色 + 图标）
const rowActionsFunc: RowActionsFunc<UserRow> = constActions<UserRow>(
  {
    name: "edit",
    desc: "编辑",
    icon: EditIcon,
    execute: (item) => {
      ElMessage.info(`编辑：${item.name}（${item.email}）`);
      return Promise.resolve();
    },
  },
  {
    name: "delete",
    desc: "删除",
    type: "danger",
    icon: DeleteIcon,
    show: (item) => item.id !== 1,
    execute: (item, table) => {
      const i = rows.findIndex((r) => r.id === item.id);
      if (i >= 0) rows.splice(i, 1);
      ElMessage.success(`已删除：${item.name}`);
      // action 完成后调用 table.reload() 刷新当前页
      table.reload();
      return Promise.resolve();
    },
  },
);
</script>

<template>
  <DemoPageLayout
    title="带行操作的表格"
    hint="表头 + const 数据 + 行操作：rowActionsFunc 由 constActions 提供，最后一列显示「编辑 / 删除」；首行因 show 条件不显示「删除」，删除后 Table 自动 reload。行操作按钮带 icon（铅笔 / 垃圾桶，函数式组件经 Action.icon 传入，渲染层 <component :is> 兼容）与 type（删除 danger 红色）。用上方外部切换控件（v-model:view-mode）切到卡片或列表视图后，在卡片/列表行上点右键弹出同一套行操作菜单。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button value="table">表格</el-radio-button>
        <el-radio-button value="card">卡片</el-radio-button>
        <el-radio-button value="list">列表</el-radio-button>
      </el-radio-group>
    </template>

    <ys-table
      :meta-fun="metaFun"
      :data-fun="dataFun"
      v-model:view-mode="viewMode"
      :row-actions-func="rowActionsFunc"
    />
  </DemoPageLayout>
</template>
