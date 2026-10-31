// @ys-knife-crud/antd public entry
//
// React 18 + antd 5 组件库适配层：只负责视图，
// 业务逻辑下沉到 @ys-knife-crud/react（hooks），数据契约来自 @ys-knife-crud/core。
// 组件名、props 名与 ref 暴露的方法与 @ys-knife-crud/element-plus 保持一致。

import { YsTable } from "./table/table";
import { YsTablePage } from "./tablepage/tablePage";
import { YsInfiniteList } from "./table/infiniteList";
import { YsCommandBar } from "./commandBar/commandBar";
import { YsTableActionMenuButton } from "./commandBar/tableActionMenuButton";
import { YsMainPanel } from "./mainPanel/mainPanel";
import { YsFilterPanel } from "./filter/filterPanel";
import { YsRootFilterPanel } from "./filter/rootFilterPanel";
import { YsTextFilterItem } from "./filter/textFilterItem";
import { YsDateFilterItem } from "./filter/dateFilterItem";
import { YsDateRangeFilterItem } from "./filter/dateRangeFilterItem";
import { YsEnumFilterItem } from "./filter/enumFilterItem";
import { YsFilterItemLayout } from "./filter/filterItemLayout";
import { YsAdvancedFilterPanel } from "./advancedFilter/advancedFilterPanel";
import { YsAdvancedValueEditor } from "./advancedFilter/advancedValueEditor";
import { YsAdvancedConditionGroup } from "./advancedFilter/advancedConditionGroup";
import { YsImportExcel } from "./importExcel/importExcel";
import { openModal } from "./modal/openModal";
import { openDialog } from "./modal/openDialog";

export {
  YsTable,
  YsTablePage,
  YsInfiniteList,
  YsCommandBar,
  YsTableActionMenuButton,
  YsMainPanel,
  YsFilterPanel,
  YsRootFilterPanel,
  YsTextFilterItem,
  YsDateFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
  YsFilterItemLayout,
  YsAdvancedFilterPanel,
  YsAdvancedValueEditor,
  YsAdvancedConditionGroup,
  YsImportExcel,
  // 代码式弹窗服务
  openModal,
  openDialog,
};

// ---------------- 组件 props / 暴露 API 类型 ----------------
export type { YsTableProps, YsSelectionBarContext } from "./table/table";
export type { YsTablePageProps, YsTablePageApi } from "./tablepage/tablePage";
export type { TablePageDataFun } from "./tablepage/tablePageTypes";
export type { YsInfiniteListProps, YsInfiniteListApi } from "./table/infiniteList";
export type { YsCommandBarProps } from "./commandBar/commandBar";
export type { YsTableActionMenuButtonProps } from "./commandBar/tableActionMenuButton";
export type { YsMainPanelProps } from "./mainPanel/mainPanel";
export type {
  FilterPanelProps,
  FilterPanelHandle,
  FilterPanelMode,
} from "./filter/filterPanel";
export type { RootFilterPanelProps, RootFilterPanelHandle } from "./filter/rootFilterPanel";
export type { TextFilterItemProps } from "./filter/textFilterItem";
export type { DateFilterItemProps } from "./filter/dateFilterItem";
export type { DateRangeFilterItemProps } from "./filter/dateRangeFilterItem";
export type { EnumFilterItemProps } from "./filter/enumFilterItem";
export type { FilterItemLayoutProps } from "./filter/filterItemLayout";
export type {
  AdvancedFilterPanelProps,
  AdvancedFilterPanelHandle,
} from "./advancedFilter/advancedFilterPanel";
export type { AdvancedValueEditorProps } from "./advancedFilter/advancedValueEditor";
export type { AdvancedConditionGroupProps } from "./advancedFilter/advancedConditionGroup";
export type { ImportExcelProps, ImportExcelHandle } from "./importExcel/importExcel";
export type { YsColumnConfigDialogProps } from "./table/columnConfigDialog";
export type { YsExportExcelDialogProps } from "./table/exportExcelDialog";

// 代码式弹窗契约（与 react 包一致）
export type { ModalOptions, ModalHandle, ModalAction, DialogOptions } from "@ys-knife-crud/react";

// 高级查询面板的已存查询预设类型（quickQueries / savedQueries 用）
export type { SavedQuery } from "./advancedFilter/advancedFilterContext";

// 枚举 FilterItem 的选项数据源类型与工厂函数（定义在 core，便于使用方一处 import）
export type { EnumOption, EnumOptionsSource } from "@ys-knife-crud/core";
export {
  fromOptions,
  fromObjectItems,
  fromArray,
  fromBool,
} from "@ys-knife-crud/core";
