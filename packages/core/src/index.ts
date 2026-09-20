// @ys.knife.crud/core public entry
//
// This package is a thin aggregator at the moment. It re-exports `ys.knife.query.js`
// so that consumers only have to install one library to drive their data sources.
//
// Add your own types / data-source implementations below as the project grows.

export * from "ys.knife.query.js";

// Convenience named re-export of the most commonly used surface, in case callers
// prefer `import { query, QueryBuilder, PageReq } from "@ys.knife.crud/core"` over
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
// ui.ts 只有纯类型（interface/type）→ verbatimModuleSyntax 下必须用 export type *
export type * from "./ui";
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
