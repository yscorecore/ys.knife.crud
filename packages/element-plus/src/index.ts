import type { App, Plugin } from "vue";
import YsTable from "./table/table.vue";
import YsMainPanel from "./mainPanel/mainPanel.vue";
import YsFilterPanel from "./filter/filterPanel.vue";
import YsTextFilterItem from "./filter/textFilterItem.vue";

export { YsTable, YsMainPanel, YsFilterPanel, YsTextFilterItem };

// <script setup> 里的 interface 不是模块导出成员，用实例类型提取 props
export type YsTableProps = InstanceType<typeof YsTable>["$props"];
export type YsMainPanelProps = InstanceType<typeof YsMainPanel>["$props"];
export type YsFilterPanelProps = InstanceType<typeof YsFilterPanel>["$props"];
export type YsTextFilterItemProps = InstanceType<typeof YsTextFilterItem>["$props"];

/**
 * Vue 插件：app.use(YsCrudElementPlus) 全局注册后，模板里可直接写
 * <ys-table> / <ys-main-panel> / <ys-filter-panel> / <ys-text-filter-item>。
 * 不想全局注册时，也可以按需 import { YsTable, YsMainPanel, YsFilterPanel, YsTextFilterItem } 局部使用，
 * 模板中写作 <ys-table>（kebab）或 <YsTable>（Pascal）均可。
 */
const YsCrudElementPlus: Plugin = {
  install(app: App) {
    app.component("YsTable", YsTable);
    app.component("YsMainPanel", YsMainPanel);
    app.component("YsFilterPanel", YsFilterPanel);
    app.component("YsTextFilterItem", YsTextFilterItem);
  },
};

export default YsCrudElementPlus;
