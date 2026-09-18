import type { App, Plugin } from "vue";
import YsTable from "./table.vue";

export { YsTable };

// <script setup> 里的 interface 不是模块导出成员，用实例类型提取 props
export type YsTableProps = InstanceType<typeof YsTable>["$props"];

/**
 * Vue 插件：app.use(YsCrudElementPlus) 全局注册后，模板里可直接写 <ys-table>。
 * 不想全局注册时，也可以按需 import { YsTable } 局部使用，
 * 模板中写作 <ys-table> 或 <YsTable> 均可。
 */
const YsCrudElementPlus: Plugin = {
  install(app: App) {
    app.component("YsTable", YsTable);
  },
};

export default YsCrudElementPlus;
