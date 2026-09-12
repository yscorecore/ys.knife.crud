import Table from "./Table.vue";

export { Table };

// <script setup> 里的 interface 不是模块导出成员，用实例类型提取 props
export type TableProps = InstanceType<typeof Table>["$props"];
