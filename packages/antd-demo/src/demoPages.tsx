import type { ComponentType } from "react";
import EmptyPage from "./pages/table/EmptyPage";
import ConstPage from "./pages/table/ConstPage";
import ActionsPage from "./pages/table/ActionsPage";
import ListPage from "./pages/table/ListPage";
import SearchPanelPage from "./pages/table/SearchPanelPage";
import PagedPage from "./pages/table/PagedPage";
import FooterPage from "./pages/table/FooterPage";
import UnknownTotalPage from "./pages/table/UnknownTotalPage";
import CheckboxPage from "./pages/table/CheckboxPage";
import CustomPage from "./pages/table/CustomPage";
import ComboPage from "./pages/table/ComboPage";
import ExportPage from "./pages/table/ExportPage";
import CustomExportPage from "./pages/table/CustomExportPage";
import DataLoadedPage from "./pages/table/DataLoadedPage";
import ColumnWidthPage from "./pages/table/ColumnWidthPage";
import ColumnRenderPage from "./pages/table/ColumnRenderPage";
import CsvExportPage from "./pages/table/CsvExportPage";
import ExternalControlPage from "./pages/table/ExternalControlPage";
import BigDataPage from "./pages/table/BigDataPage";
import BigDataNoTotalPage from "./pages/table/BigDataNoTotalPage";
import LongExportEtaPage from "./pages/table/LongExportEtaPage";
import SelectionBarPage from "./pages/table/SelectionBarPage";
import CustomEntryButtonsPage from "./pages/table/CustomEntryButtonsPage";
import CardListPage from "./pages/table/CardListPage";
import LoadingPage from "./pages/table/LoadingPage";
import FillHeightPage from "./pages/table/FillHeightPage";
import AdminLayoutPage from "./pages/table/AdminLayoutPage";
import AdminExternalSearchPage from "./pages/table/AdminExternalSearchPage";
import FilterPanelPage from "./pages/filter/FilterPanelPage";
import AdvancedFilterPage from "./pages/filter/AdvancedFilterPage";
import SwitchableFilterPage from "./pages/filter/SwitchableFilterPage";
import SingleLineFilterPage from "./pages/filter/SingleLineFilterPage";
import TablePageDemo from "./pages/tablePage/TablePageDemo";
import TablePageFillHeightDemo from "./pages/tablePage/TablePageFillHeightDemo";
import ImportExcelPage from "./pages/importExcel/ImportExcelPage";
import ImportExcelBatchPage from "./pages/importExcel/ImportExcelBatchPage";
import ModalPage from "./pages/modal/ModalPage";
import InfiniteListPage from "./pages/table/InfiniteListPage";

/** 所有演示页统一接收的 props：返回导航页 */
export interface DemoPageProps {
  onBack: () => void;
}

/**
 * Demo 页面注册表：导航按钮与 App 动态渲染共用的唯一数据源。
 * 新增一个 demo 只需：在 pages/ 下建页面组件，并在此数组追加一行。
 * id / label / 顺序与 element-plus-demo 的 demoPages.ts 一一对应。
 */
export interface DemoPageDef {
  /** 页面标识，同时用于导航状态与按钮 key */
  id: string;
  /** 导航按钮文案 */
  label: string;
  /** 页面组件（统一约定接收 onBack 返回导航页） */
  component: ComponentType<DemoPageProps>;
}

export const demoPages = [
  { id: "table-empty", label: "空数据表格（emptyData + #empty 插槽）", component: EmptyPage },
  { id: "table-const", label: "固定数据表格（constData）", component: ConstPage },
  {
    id: "table-actions",
    label: "带行操作的表格（constData + constActions）",
    component: ActionsPage,
  },
  { id: "table-list", label: "异步列表表格（listData）", component: ListPage },
  {
    id: "table-search-panel",
    label: "搜索面板 + 表格（样式预览，数据不联动）",
    component: SearchPanelPage,
  },
  { id: "table-paged", label: "分页表格（25 行数据自动分页）", component: PagedPage },
  { id: "table-footer", label: "底部插槽表格（#footer 插槽 + 分页）", component: FooterPage },
  {
    id: "table-unknown-total",
    label: "未知总条数（totalCount=null + 导出进度 99% 封顶）",
    component: UnknownTotalPage,
  },
  {
    id: "table-checkbox",
    label: "可勾选表格（showCheckbox + 分页）",
    component: CheckboxPage,
  },
  { id: "table-custom", label: "自定义列表格（外部列设置入口）", component: CustomPage },
  {
    id: "table-combo",
    label: "可勾选 + 自定义列表格（showCheckbox + 外部列设置）",
    component: ComboPage,
  },
  { id: "table-export", label: "导出 Excel（外部导出入口）", component: ExportPage },
  {
    id: "table-custom-export",
    label: "自定义列 + 导出 Excel（外部列设置 + 外部导出）",
    component: CustomExportPage,
  },
  {
    id: "table-data-loaded",
    label: "数据加载事件（@data-loaded）",
    component: DataLoadedPage,
  },
  {
    id: "table-column-width",
    label: "列宽拖动（header-dragend + 防抖保存）",
    component: ColumnWidthPage,
  },
  {
    id: "table-column-render",
    label: "自定义列渲染（column render 优先）",
    component: ColumnRenderPage,
  },
  {
    id: "table-csv-export",
    label: "自定义导出实现（exportorFunc → CSV）",
    component: CsvExportPage,
  },
  {
    id: "table-external-control",
    label: "外部 prop 驱动（pageSize 变化 + 切换数据源）",
    component: ExternalControlPage,
  },
  {
    id: "table-big-data",
    label: "大数据全功能表格（10000 行，显示总条数）",
    component: BigDataPage,
  },
  {
    id: "table-big-data-no-total",
    label: "大数据全功能表格（10000 行，不返回总条数）",
    component: BigDataNoTotalPage,
  },
  {
    id: "table-long-export-eta",
    label: "长耗时导出（预计剩余时间倒数）",
    component: LongExportEtaPage,
  },
  {
    id: "table-custom-selection-bar",
    label: "自定义选中提示条（外部实现选中条）",
    component: SelectionBarPage,
  },
  {
    id: "table-custom-entry-buttons",
    label: "自定义列设置/导出按钮（openConfigDialog / openExportDialog）",
    component: CustomEntryButtonsPage,
  },
  {
    id: "table-card-view",
    label: "表格 / 卡片 / 列表视图切换（viewMode + #card / #list 插槽）",
    component: CardListPage,
  },
  {
    id: "table-loading",
    label: "加载中效果（2 秒慢接口 + #loading 插槽）",
    component: LoadingPage,
  },
  {
    id: "table-fill-height",
    label: "占满容器高度（内容滚动 + 分页固定）",
    component: FillHeightPage,
  },
  {
    id: "table-admin-layout",
    label: "管理系统布局（功能树 + 主面板选项卡）",
    component: AdminLayoutPage,
  },
  {
    id: "table-admin-external-search",
    label: "主面板外置功能搜索（showMenuSearch=false + v-model）",
    component: AdminExternalSearchPage,
  },
  {
    id: "filter-panel",
    label: "查询条件面板（FilterPanel + TextFilterItem）",
    component: FilterPanelPage,
  },
  {
    id: "filter-advanced-panel",
    label: "高级查询面板（任意嵌套 AND/OR 组合）",
    component: AdvancedFilterPage,
  },
  {
    id: "filter-switchable",
    label: "搜索面板 + 全功能表格（简单/高级 + 快速查询）",
    component: SwitchableFilterPage,
  },
  {
    id: "filter-single-line",
    label: "搜索面板单行模式（展开/折叠 + 全功能表格）",
    component: SingleLineFilterPage,
  },
  {
    id: "table-page",
    label: "查询+命令+表格三合一（YsTablePage 自动联动）",
    component: TablePageDemo,
  },
  {
    id: "table-page-fill-height",
    label: "YsTablePage 占满高度（内容滚动 + 分页固定）",
    component: TablePageFillHeightDemo,
  },
  {
    id: "import-excel",
    label: "Excel 数据导入（选文件 + 校验状态 + 逐行处理）",
    component: ImportExcelPage,
  },
  {
    id: "import-excel-batch",
    label: "Excel 批量导入（batchSize 分批，可切换批次大小）",
    component: ImportExcelBatchPage,
  },
  {
    id: "modal-open",
    label: "代码式弹窗（openModal，无需 template 声明）",
    component: ModalPage,
  },
  {
    id: "infinite-list",
    label: "无限滚动列表（YsInfiniteList，触底自动加载）",
    component: InfiniteListPage,
  },
] as const satisfies readonly DemoPageDef[];

/** 从注册表推导页面 id 联合类型，新增条目后类型自动扩展 */
export type DemoPageId = (typeof demoPages)[number]["id"];
