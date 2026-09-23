import { h, type FunctionalComponent, type VNode } from "vue";
import { ElMessage } from "element-plus";
import { type TableAction } from "@ys.knife.crud/core";

/**
 * 表格级命令图标工厂：14px 线性风格（Feather 风格），stroke 跟随按钮文字颜色（currentColor）。
 * TableAction.icon 类型为 unknown，渲染层用 <component :is> 兼容函数式组件 / VNode。
 */
function makeSvgIcon(children: VNode[]): FunctionalComponent {
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
      children,
    );
}

// 刷新 / 查看选中 / 新增 / 批量删除 图标
const RefreshIcon = makeSvgIcon([
  h("polyline", { points: "21 12 21 4 13 4" }),
  h("polyline", { points: "3 12 3 20 11 20" }),
  h("path", { d: "M21 4l-7.2 7.2a4 4 0 0 1-5.6 0L3 8" }),
]);
const ViewSelectedIcon = makeSvgIcon([
  h("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" }),
  h("circle", { cx: 12, cy: 12, r: 3 }),
]);
const AddIcon = makeSvgIcon([
  h("line", { x1: 12, y1: 5, x2: 12, y2: 19 }),
  h("line", { x1: 5, y1: 12, x2: 19, y2: 12 }),
]);
const BatchDeleteIcon = makeSvgIcon([
  h("polyline", { points: "3 6 5 6 21 6" }),
  h("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
  h("line", { x1: 10, y1: 11, x2: 10, y2: 17 }),
  h("line", { x1: 14, y1: 11, x2: 14, y2: 17 }),
]);

/**
 * 演示用表级命令集合（SwitchableFilterPage / SingleLineFilterPage 共享）。
 * execute 接收 TableApi，无需依赖组件内 tableRef——刷新调 reload、选中数读 selectedRows。
 */
export const tableCommands: TableAction[] = [
  {
    name: "refresh",
    desc: "刷新",
    icon: RefreshIcon,
    execute: async (table) => {
      table.reload();
      ElMessage.success("已刷新表格数据");
    },
  },
  {
    name: "viewSelected",
    desc: "查看选中",
    icon: ViewSelectedIcon,
    execute: async (table) => {
      const n = table.selectedRows.length;
      if (n === 0) {
        ElMessage.warning("当前未选中任何行");
        return;
      }
      ElMessage.info(`当前已跨页选中 ${n} 行`);
    },
  },
  {
    name: "add",
    desc: "新增",
    type: "primary",
    icon: AddIcon,
    execute: async () => {
      ElMessage.info("测试命令：新增（演示入口）");
    },
  },
  {
    name: "batchDelete",
    desc: "批量删除",
    type: "danger",
    plain: true,
    icon: BatchDeleteIcon,
    execute: async (table) => {
      const n = table.selectedRows.length;
      if (n === 0) {
        ElMessage.warning("请先勾选要删除的行");
        return;
      }
      ElMessage.success(`测试命令：批量删除 ${n} 行（演示入口，未真实删除）`);
    },
  },
];
