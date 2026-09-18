import type { Component } from "vue";
import EmptyTablePage from "./pages/table/EmptyTablePage.vue";
import ConstTablePage from "./pages/table/ConstTablePage.vue";
import ActionsTablePage from "./pages/table/ActionsTablePage.vue";
import ListTablePage from "./pages/table/ListTablePage.vue";
import PagedTablePage from "./pages/table/PagedTablePage.vue";
import UnknownTotalTablePage from "./pages/table/UnknownTotalTablePage.vue";
import ExportMaxPagesTablePage from "./pages/table/ExportMaxPagesTablePage.vue";
import CheckboxTablePage from "./pages/table/CheckboxTablePage.vue";
import CustomTablePage from "./pages/table/CustomTablePage.vue";
import ComboTablePage from "./pages/table/ComboTablePage.vue";
import ExportTablePage from "./pages/table/ExportTablePage.vue";
import CustomExportTablePage from "./pages/table/CustomExportTablePage.vue";
import DataLoadedTablePage from "./pages/table/DataLoadedTablePage.vue";
import ColumnWidthTablePage from "./pages/table/ColumnWidthTablePage.vue";
import ColumnRenderTablePage from "./pages/table/ColumnRenderTablePage.vue";
import CsvExportTablePage from "./pages/table/CsvExportTablePage.vue";
import ExternalControlTablePage from "./pages/table/ExternalControlTablePage.vue";
import ExternalEntryButtonsTablePage from "./pages/table/ExternalEntryButtonsTablePage.vue";
import BigDataTablePage from "./pages/table/BigDataTablePage.vue";
import BigDataNoTotalTablePage from "./pages/table/BigDataNoTotalTablePage.vue";

/**
 * Demo 页面注册表：导航按钮与 App 动态渲染共用的唯一数据源。
 * 新增一个 demo 只需：在 pages/ 下建页面组件，并在此数组追加一行。
 */
export interface DemoPageDef {
  /** 页面标识，同时用于导航状态与按钮 key */
  id: string;
  /** 导航按钮文案 */
  label: string;
  /** 页面组件（统一约定 emit "back" 返回导航页） */
  component: Component;
}

export const demoPages = [
  { id: "table-empty", label: "空数据表格（emptyData + #empty 插槽）", component: EmptyTablePage },
  { id: "table-const", label: "固定数据表格（constData）", component: ConstTablePage },
  {
    id: "table-actions",
    label: "带行操作的表格（constData + constActions）",
    component: ActionsTablePage,
  },
  { id: "table-list", label: "异步列表表格（listData）", component: ListTablePage },
  { id: "table-paged", label: "分页表格（25 行数据自动分页）", component: PagedTablePage },
  {
    id: "table-unknown-total",
    label: "未知总条数（totalCount=null + indeterminate 导出进度）",
    component: UnknownTotalTablePage,
  },
  {
    id: "table-export-max-pages",
    label: "导出页数上限（exportMaxPages=3 截断导出）",
    component: ExportMaxPagesTablePage,
  },
  {
    id: "table-checkbox",
    label: "可勾选表格（showCheckbox + 分页）",
    component: CheckboxTablePage,
  },
  { id: "table-custom", label: "自定义列表格（showCustomConfig）", component: CustomTablePage },
  {
    id: "table-combo",
    label: "可勾选 + 自定义列表格（showCheckbox + showCustomConfig）",
    component: ComboTablePage,
  },
  { id: "table-export", label: "导出 Excel（showExportExcel）", component: ExportTablePage },
  {
    id: "table-custom-export",
    label: "自定义列 + 导出 Excel（showCustomConfig + showExportExcel）",
    component: CustomExportTablePage,
  },
  {
    id: "table-data-loaded",
    label: "数据加载事件（@data-loaded）",
    component: DataLoadedTablePage,
  },
  {
    id: "table-column-width",
    label: "列宽拖动（header-dragend + 防抖保存）",
    component: ColumnWidthTablePage,
  },
  {
    id: "table-column-render",
    label: "自定义列渲染（column render 优先）",
    component: ColumnRenderTablePage,
  },
  {
    id: "table-csv-export",
    label: "自定义导出实现（exportorFunc → CSV）",
    component: CsvExportTablePage,
  },
  {
    id: "table-external-control",
    label: "外部 prop 驱动（pageSize 变化 + 切换数据源）",
    component: ExternalControlTablePage,
  },
  {
    id: "table-external-entry-buttons",
    label: "外部自定义入口按钮（openConfigDialog/openExportDialog）",
    component: ExternalEntryButtonsTablePage,
  },
  {
    id: "table-big-data",
    label: "大数据全功能表格（10000 行，显示总条数）",
    component: BigDataTablePage,
  },
  {
    id: "table-big-data-no-total",
    label: "大数据全功能表格（10000 行，不返回总条数）",
    component: BigDataNoTotalTablePage,
  },
] as const satisfies readonly DemoPageDef[];

/** 从注册表推导页面 id 联合类型，新增条目后类型自动扩展 */
export type DemoPageId = (typeof demoPages)[number]["id"];

/** id → 页面定义，供 App 按当前导航状态解析组件 */
export const demoPageMap = new Map(
  demoPages.map((page) => [page.id, page] as const),
);
