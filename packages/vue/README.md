# @ys.knife.crud/vue

Reusable **Vue 3 composables** for `ys.knife.crud` — the UI-library-agnostic logic layer that drives a CRUD table.

These composables encapsulate the table business logic (column configuration, Excel export, row actions) without depending on any specific UI component library, so any Vue 3 project can consume them. They build on top of [`@ys.knife.crud/core`](../core) for the framework-agnostic contracts (`Meta`, `Column`, `Action`, `ExportApi`, `CustomConfig`, …).

The element-plus view layer ([`@ys.knife.crud/element-plus`](../element-plus)) is one consumer: it keeps only the `.vue` components and delegates all logic to this package.

## Features

| Composable | Responsibility |
| --- | --- |
| `useDefault` | Table default state (`meta`, `paged`, `rows`, `metaLoading`, `dataLoading`, `currentPage`), derived `total`, and `loadMeta`. Leaves page-size-dependent logic (`loadData`, `showPagination`) to the view layer. |
| `useCustomConfig` | Column visibility / order / width + user default page size, plus the column-settings panel draft state. |
| `useExportExcel` | Export scope selection (selected / current page / all), streaming pagination fetch with progress & cancel, and "keep partial file / discard" flow. |
| `useRowActions` | Load row actions (`rowActionsFunc`), plus `visibleActions` / `isEnabled` pure helpers. |
| `useSelection` | Track checkbox selection (cross-page accumulation) and clear all selections. |

## Installation

```bash
# npm
npm install @ys.knife.crud/vue @ys.knife.crud/core

# pnpm
pnpm add @ys.knife.crud/vue @ys.knife.crud/core

# yarn
yarn add @ys.knife.crud/vue @ys.knife.crud/core
```

## Peer dependencies

| Package | Version | Notes |
| --- | --- | --- |
| `vue` | `^3.5.0` | Must be installed by the consuming project. |

`@ys.knife.crud/core` is a regular dependency and is pulled in automatically.

## Usage

All composables are named exports from the package entry:

```ts
import {
  useCustomConfig,
  useExportExcel,
  useRowActions,
  useSelection,
  visibleActions,
  isEnabled,
} from "@ys.knife.crud/vue";
```

### `useCustomConfig`

Manages the user's column configuration (visibility, order, width) and the user's default page size. Reads `meta` to determine which columns are candidates (`showForDisplay === true`).

```ts
const props = defineProps<{
  showCustomConfig: boolean;
  loadCustomConfigFun?: loadCustomConfigFunc;
  saveCustomConfigFun?: saveCustomConfigFunc;
}>();

const meta = ref<Meta | null>(null);

const {
  columns,              // ComputedRef<Column[]> — final visible columns in display order,
                        // each Column carries `width` (px string, e.g. "120") from CustomConfig
  loadCustomConfigs,    // (signal?) => Promise<void>
  customConfigLoading,  // Ref<boolean> — true while loadCustomConfigs is in flight
  defaultPageSize,      // Ref<number | undefined> — user's saved default page size
  updateDefaultPageSize, // (size: number) => void — update state + persist as default
  configDialogVisible,  // Ref<boolean>
  draftColumns,         // Ref<DraftColumn[]>
  openConfigDialog,     // () => void
  moveDraft,            // (index: number, delta: number) => void
  resetDraft,           // () => void
  saveConfigDialog,     // () => Promise<void>
} = useCustomConfig(props, meta);
```

### `useExportExcel`

Drives Excel export. `scope === "all"` streams data page by page via `dataFun`, writing each page through `ExportApi.renderRows` so memory stays bounded. Cancellation supports a "keep the partial file already written" confirmation.

The composable owns all dialog visibility, progress state, and actions. **Recommended pattern**: a dialog component calls `useExportExcel` internally and exposes `openExportDialog()` via `defineExpose`, so the parent only passes data inputs and never touches export-internal state.

```ts
import { toRef } from "vue";
import { useExportExcel } from "@ys.knife.crud/vue";

// Inside a self-managing dialog component (e.g. exportExcelDialog.vue)
const props = defineProps<{
  dataFun: PageFunc<unknown>;
  exportSelected: boolean;
  exportorFunc?: ExportApiFunc;
  tableName?: string;
  columns: Column[];
  currentRows: Record<string, unknown>[];
  selectedRows: unknown[];
  total: number;
  exportPageSize: number;
  hasMorePage: boolean;
}>();

const {
  exportOptions,          // ComputedRef<ExportOption[]>
  exportDialogVisible,    // Ref<boolean>
  exporting,              // Ref<boolean>
  exportFetched,          // Ref<number>
  exportTotal,            // Ref<number> — starts from the caller-provided total
  exportTotalKnown,       // Ref<boolean> — true only after a response carries a real totalCount
  exportEtaSeconds,       // ComputedRef<number | null> — estimated seconds remaining, null when unknown
  exportPercent,          // ComputedRef<number> — capped at 99% until real totalCount arrives
  exportCancelledVisible, // Ref<boolean>
  exportCancelledRows,    // Ref<number>
  onExportClick,          // () => void — auto-skips dialog when only one option is enabled
  doExport,               // (scope: ExportScope) => Promise<void>
  cancelExport,           // () => void
  keepPartialExport,      // () => Promise<void>
  discardPartialExport,   // () => Promise<void>
} = useExportExcel({
  props,          // reactive — dataFun/exportSelected/exportorFunc auto-tracked
  tableName: toRef(props, "tableName"),
  columns: toRef(props, "columns"),
  currentRows: toRef(props, "currentRows"),
  selectedRows: toRef(props, "selectedRows"),
  total: toRef(props, "total"),
  exportPageSize: toRef(props, "exportPageSize"),
  hasMorePage: toRef(props, "hasMorePage"),
});

// Expose the entry point so the parent's toolbar button can start the export flow
defineExpose({ openExportDialog: onExportClick });
```

> **Why `toRef`?** Vue auto-unwraps `Ref` values passed as props, so `props.tableName` is `string | undefined`, not `Ref<string | undefined>`. `toRef(props, "tableName")` re-wraps it into a `Ref` that the composable can read via `.value`, preserving reactivity. The `columns`/`currentRows`/`total`/`exportPageSize`/`hasMorePage` options accept `Ref<T>` (not strictly `ComputedRef<T>`), so both `computed()` results and `toRef()` wrappers work.

> **Unknown total.** During "export all", `exportTotal` is seeded from the caller-provided `total` (an estimate when the API omits `totalCount`), but `exportTotalKnown` only turns true once a page response carries a real `totalCount`. Until then the percentage scrolls with the loaded count, capped at 99%, and `exportEtaSeconds` stays `null` (no remaining-time estimate is possible against a moving denominator); after that the bar converges to the exact percentage and `exportEtaSeconds` extrapolates the remaining time from the observed fetch rate (recomputed on a 500ms tick so it counts down between page requests). The stream still terminates correctly on `hasNext: false`.

The parent component then only wires data inputs and calls `openExportDialog()`:

```vue
<ExportExcelDialog
  v-if="showExportExcel"
  ref="exportDialogRef"
  :data-fun="props.dataFun"
  :export-selected="props.showCheckbox"
  :exportor-func="props.exportorFunc"
  :table-name="meta?.displayName ?? '数据'"
  :columns="columns"
  :current-rows="rows"
  :selected-rows="selectedRows"
  :export-page-size="props.exportPageSize"
  :total="total"
  :has-more-page="showPagination"
/>
<!-- toolbar button -->
<el-button v-if="showExportExcel" @click="exportDialogRef?.openExportDialog()">⬇ 导出 Excel</el-button>
```

If `exportorFunc` is not provided, the core console stub (`createConsoleExportApiFunc`) is used — it logs calls and produces no file. Inject a real implementation such as [`@ys.knife.crud/export-exceljs`](../export-exceljs) for actual file output.

### `useRowActions`

Loads the row action list. Visibility and enabled-state filtering are exposed as pure functions so they can be used in render functions / templates without depending on the composable's internal state.

```ts
const {
  actions,        // Ref<Action<unknown>[]>
  actionsLoading, // Ref<boolean>
  loadActions,    // (signal?) => Promise<void>
} = useRowActions(props); // props: { rowActionsFunc?: RowActionsFunc<unknown> }

// Pure helpers (also exported from the package entry)
const visible = visibleActions(actions.value, row);
const disabled = !isEnabled(action, row);
```

### `useSelection`

Tracks checkbox selection in a UI-library-agnostic `Map` keyed by `rowKey`. The same state drives both a table view (el-table selection column in controlled mode — `restoreSelection` re-checks the current page after paging or remounting) and a card view (per-card checkbox via `isRowSelected` / `toggleRowSelection`), so selection persists across pages and across view switches.

```ts
const tableEl = ref<{ clearSelection?: () => void; toggleRowSelection?: (row: unknown, selected?: boolean) => void } | null>(null);

const {
  selectedRows,       // ComputedRef<unknown[]> — cross-page accumulated selection
  onSelectionChange,  // (selection: unknown[]) => void — el-table selection-change handler
  isRowSelected,      // (row) => boolean — card checkbox model-value / selected style
  toggleRowSelection, // (row, selected?) => void — card checkbox toggle (also syncs el-table)
  restoreSelection,   // () => Promise<void> — re-apply accumulated selection to the current table page
  clearSelection,     // () => void — clears all pages
} = useSelection({ tableEl, rows, rowKey: toRef(props, "rowKey") });
```

## Relationship to other packages

```
┌─────────────────────────────────────────────────┐
│  @ys.knife.crud/element-plus  (.vue)            │  ← element-plus view layer
└───────────────────────┬─────────────────────────┘
                        │ consumes
                        ▼
┌─────────────────────────────────────────────────┐
│  @ys.knife.crud/vue  (composables)              │  ← this package
└───────────────────────┬─────────────────────────┘
                        │ depends on
                        ▼
┌─────────────────────────────────────────────────┐
│  @ys.knife.crud/core  (contracts & types)       │  ← framework-agnostic
└─────────────────────────────────────────────────┘

         @ys.knife.crud/export-exceljs
         (ExportApi implementation, injected as exportorFunc)
```

## Scripts

Run from `packages/vue`:

| Script | What it does |
| --- | --- |
| `pnpm build` | Build with `tsup` (ESM + CJS + `.d.ts`). |
| `pnpm test` | Run unit tests with `vitest`. |
| `pnpm test:watch` | Watch mode for tests. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm clean` | Remove `dist/`. |

## License

MIT.
