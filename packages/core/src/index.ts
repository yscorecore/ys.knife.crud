// @ys-knife-crud/core public entry
//
// This package is a thin aggregator at the moment. It re-exports `ys.knife.query.js`
// so that consumers only have to install one library to drive their data sources.
//
// Add your own types / data-source implementations below as the project grows.

export * from "ys.knife.query.js";

// Convenience named re-export of the most commonly used surface, in case callers
// prefer `import { query, QueryBuilder, PageReq } from "@ys-knife-crud/core"` over
// reaching for the underlying `ys.knife.query.js` dependency directly.
//
// Note: `verbatimModuleSyntax` is on, so pure types (interfaces) must be re-exported
// with `export type`; classes/enums/functions keep the regular `export` form.
export {
  query,
  QueryBuilder,
  Operator,
  OrderByType,
  AggType,
  FilterInfo,
  OrderByInfo,
  SelectInfo,
  AggInfo,
  // 单条件 FilterInfo 工厂函数（vue 包的 useFilterItem 用这些构造每个 item 的 FilterInfo）
  filter,
  emptyFilter,
} from "ys.knife.query.js";

export type { PageReq, PagedList,PageFunc } from "ys.knife.query.js";

// --- 本地 framework-agnostic 类型与工具 ---
// meta.ts 混合导出（constMetaFunc 是值，Column/Meta/MetaFunc 是类型）→ 用 export *
export * from "./meta";
// 拆分自原 ui.ts 的三个领域契约，均为纯类型 → verbatimModuleSyntax 下用 export type *
// table.ts：表格输入/输出契约（TableProps/TableApi/ViewMode/ExportScope 等）
export type * from "./table";
// mainPanel.ts：主面板功能树契约（FunctionNode/MainPanelProps 等）
export type * from "./mainPanel";
// filter.ts：单字段与面板级查询条件契约（FilterItemApi/FilterPanelApi 等）
export type * from "./filter";
// page.ts 混合：constData/emptyData/listData 是值（用 export），ListFunc 是纯类型（用 export type）。
// 分页契约 PageFunc/PageReq 已在上方直接从 ys.knife.query.js re-export，这里不再重复导出以免冲突。
export { constData, emptyData, listData } from "./page";
export type { ListFunc } from "./page";
// action.ts 混合导出（constActions/emptyActions 是值，Action/RowActionsFunc 是类型）→ 用 export *
export * from "./action";
// customConfig.ts 混合导出（constConfig/emptyConfig/mergeConfigs/localStorage 助手是值，
// CustomColumnConfig/CustomConfig/loadCustomConfigFunc/saveCustomConfigFunc 是类型）→ 用 export *
export * from "./customConfig";
// export.ts 混合导出（createConsoleExportApiFunc 是值，ExportApi/ExportApiFunc 是类型）→ 用 export *
export * from "./export";
// enumOptionsSource.ts 混合导出（fromOptions/fromObjectItems/fromArray/fromBool 是值，
// EnumOptionsSource/EnumOption 是类型）→ 用 export *
export * from "./enumOptionsSource";
// advancedFilter.ts 混合导出（OPERATOR_LABELS/FIELD_TYPE_OPERATORS/推断函数是值，
// AdvancedCondition/AdvancedCombinator/AdvancedFieldType 是类型）→ 用 export *
export * from "./advancedFilter";
// importData.ts 混合导出（singleRowProcessor 是值，其余是类型）→ 用 export *
export * from "./importData";
