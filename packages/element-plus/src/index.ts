import type { App, Plugin } from "vue";
import YsTable from "./table/table.vue";
import YsTableActionMenuButton from "./commandBar/tableActionMenuButton.vue";
import YsCommandBar from "./commandBar/commandBar.vue";
import YsMainPanel from "./mainPanel/mainPanel.vue";
import YsFilterPanel from "./filter/filterPanel.vue";
import YsTextFilterItem from "./filter/textFilterItem.vue";
import YsDateFilterItem from "./filter/dateFilterItem.vue";
import YsDateRangeFilterItem from "./filter/dateRangeFilterItem.vue";
import YsEnumFilterItem from "./filter/enumFilterItem.vue";
import YsFilterItemLayout from "./filter/filterItemLayout.vue";
import YsAdvancedFilterPanel from "./advancedFilter/advancedFilterPanel.vue";
import YsAdvancedValueEditor from "./advancedFilter/advancedValueEditor.vue";
import YsAdvancedConditionGroup from "./advancedFilter/advancedConditionGroup.vue";
import YsTablePage from "./tablepage/tablePage.vue";
import YsImportExcel from "./importExcel/importExcel.vue";

export {
  YsTable,
  YsTableActionMenuButton,
  YsCommandBar,
  YsMainPanel,
  YsFilterPanel,
  YsTablePage,
  YsImportExcel,
  YsTextFilterItem,
  YsDateFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
  YsFilterItemLayout,
  YsAdvancedFilterPanel,
  YsAdvancedValueEditor,
  YsAdvancedConditionGroup,
};

// 枚举 FilterItem 的选项数据源类型:函数,返回 Promise<EnumOption[]>。
// 类型与工厂函数(EnumOption/EnumOptionsSource/fromOptions/fromObjectItems/fromArray/fromBool)
// 实际定义在 @ys.knife.crud/core(element-plus 这里只是 re-export 一份,便于使用方一处 import)。
export type {
  EnumOption,
  EnumOptionsSource,
} from "@ys.knife.crud/core";
export {
  fromOptions,
  fromObjectItems,
  fromArray,
  fromBool,
} from "@ys.knife.crud/core";

// <script setup> 里的 interface 不是模块导出成员，用实例类型提取 props
export type YsTableProps = InstanceType<typeof YsTable>["$props"];
export type YsTableActionMenuButtonProps = InstanceType<typeof YsTableActionMenuButton>["$props"];
export type YsCommandBarProps = InstanceType<typeof YsCommandBar>["$props"];
export type YsMainPanelProps = InstanceType<typeof YsMainPanel>["$props"];
export type YsFilterPanelProps = InstanceType<typeof YsFilterPanel>["$props"];
export type YsTextFilterItemProps = InstanceType<typeof YsTextFilterItem>["$props"];
export type YsDateFilterItemProps = InstanceType<typeof YsDateFilterItem>["$props"];
export type YsDateRangeFilterItemProps = InstanceType<typeof YsDateRangeFilterItem>["$props"];
export type YsEnumFilterItemProps = InstanceType<typeof YsEnumFilterItem>["$props"];
export type YsFilterItemLayoutProps = InstanceType<typeof YsFilterItemLayout>["$props"];
export type YsAdvancedFilterPanelProps = InstanceType<typeof YsAdvancedFilterPanel>["$props"];
export type YsAdvancedValueEditorProps = InstanceType<typeof YsAdvancedValueEditor>["$props"];
export type YsAdvancedConditionGroupProps = InstanceType<typeof YsAdvancedConditionGroup>["$props"];
export type YsTablePageProps = InstanceType<typeof YsTablePage>["$props"];
export type YsImportExcelProps = InstanceType<typeof YsImportExcel>["$props"];

// 高级查询面板的已存查询预设类型（v-model:quick-queries / v-model:saved-queries 用）
export type { SavedQuery } from "./advancedFilter/advancedFilterContext";

// YsTablePage 的增强 dataFun 签名：(req, filter, signal) => Promise<PagedList>
export type { TablePageDataFun } from "./tablepage/tablePageTypes";

/**
 * Vue 插件：app.use(YsCrudElementPlus) 全局注册后，模板里可直接写
 * <ys-table> / <ys-main-panel> / <ys-filter-panel> / <ys-text-filter-item> /
 * <ys-date-filter-item> / <ys-date-range-filter-item>。
 * 不想全局注册时，也可以按需 import 局部使用，
 * 模板中写作 <ys-table>（kebab）或 <YsTable>（Pascal）均可。
 */
const YsCrudElementPlus: Plugin = {
  install(app: App) {
    app.component("YsTable", YsTable);
    app.component("YsTableActionMenuButton", YsTableActionMenuButton);
    app.component("YsCommandBar", YsCommandBar);
    app.component("YsMainPanel", YsMainPanel);
    app.component("YsFilterPanel", YsFilterPanel);
    app.component("YsTextFilterItem", YsTextFilterItem);
    app.component("YsDateFilterItem", YsDateFilterItem);
    app.component("YsDateRangeFilterItem", YsDateRangeFilterItem);
    app.component("YsEnumFilterItem", YsEnumFilterItem);
    app.component("YsFilterItemLayout", YsFilterItemLayout);
    app.component("YsAdvancedFilterPanel", YsAdvancedFilterPanel);
    app.component("YsAdvancedValueEditor", YsAdvancedValueEditor);
    app.component("YsAdvancedConditionGroup", YsAdvancedConditionGroup);
    app.component("YsTablePage", YsTablePage);
    app.component("YsImportExcel", YsImportExcel);
  },
};

export default YsCrudElementPlus;
