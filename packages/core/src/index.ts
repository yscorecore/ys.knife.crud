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

} from "ys.knife.query.js";

export type { PageReq, PagedList,PageFunc } from "ys.knife.query.js";

// --- 本地 framework-agnostic 类型与工具 ---
// meta.ts 混合导出（constMetaFunc 是值，Column/Meta/MetaFunc 是类型）→ 用 export *
export * from "./meta";
// ui.ts 只有纯类型（interface/type）→ verbatimModuleSyntax 下必须用 export type *
export type * from "./ui";
// page.ts 混合：constData/emptyData 是值（用 export），ListFunc 是纯类型（用 export type）。
// 注意 PageFunc 已在上方直接从 ys.knife.query.js re-export，这里不再重复导出以免冲突。
export { constData, emptyData } from "./page";
export type { ListFunc } from "./page";
