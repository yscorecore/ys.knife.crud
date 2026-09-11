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
export {
  query,
  QueryBuilder,
  PageReq,
  Operator,
  OrderByType,
  AggType,
  FilterInfo,
  OrderByInfo,
  SelectInfo,
  AggInfo,
  PagedList,
} from "ys.knife.query.js";
