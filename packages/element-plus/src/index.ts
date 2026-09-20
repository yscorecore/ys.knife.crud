import type { App, Plugin } from "vue";
import YsTable from "./table/table.vue";
import YsMainPanel from "./mainPanel/mainPanel.vue";
import YsFilterPanel from "./filter/filterPanel.vue";
import YsTextFilterItem from "./filter/textFilterItem.vue";
import YsDateFilterItem from "./filter/dateFilterItem.vue";
import YsDateRangeFilterItem from "./filter/dateRangeFilterItem.vue";
import YsEnumFilterItem from "./filter/enumFilterItem.vue";
import YsFilterItemLayout from "./filter/filterItemLayout.vue";

export {
  YsTable,
  YsMainPanel,
  YsFilterPanel,
  YsTextFilterItem,
  YsDateFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
  YsFilterItemLayout,
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
export type YsMainPanelProps = InstanceType<typeof YsMainPanel>["$props"];
export type YsFilterPanelProps = InstanceType<typeof YsFilterPanel>["$props"];
export type YsTextFilterItemProps = InstanceType<typeof YsTextFilterItem>["$props"];
export type YsDateFilterItemProps = InstanceType<typeof YsDateFilterItem>["$props"];
export type YsDateRangeFilterItemProps = InstanceType<typeof YsDateRangeFilterItem>["$props"];
export type YsEnumFilterItemProps = InstanceType<typeof YsEnumFilterItem>["$props"];
export type YsFilterItemLayoutProps = InstanceType<typeof YsFilterItemLayout>["$props"];

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
    app.component("YsMainPanel", YsMainPanel);
    app.component("YsFilterPanel", YsFilterPanel);
    app.component("YsTextFilterItem", YsTextFilterItem);
    app.component("YsDateFilterItem", YsDateFilterItem);
    app.component("YsDateRangeFilterItem", YsDateRangeFilterItem);
    app.component("YsEnumFilterItem", YsEnumFilterItem);
    app.component("YsFilterItemLayout", YsFilterItemLayout);
  },
};

export default YsCrudElementPlus;
