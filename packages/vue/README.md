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

The composable owns all dialog visibility, progress state, and actions. **Recommended pattern**: a dialog component calls `useExportExcel` internally and exposes `trigger()` via `defineExpose`, so the parent only passes data inputs and never touches export-internal state.

```ts
import { toRef } from "vue";
import { useExportExcel } from "@ys.knife.crud/vue";

// Inside a self-managing dialog component (e.g. exportExcelDialog.vue)
const props = defineProps<{
  dataFun: PageFunc<unknown>;
  showCheckbox: boolean;
  exportorFunc?: ExportApiFunc;
  meta: Meta | null;
  columns: Column[];
  rows: Record<string, unknown>[];
  selectedRows: unknown[];
  total: number;
  innerPageSize: number;
  showPagination: boolean;
}>();

const {
  exportOptions,          // ComputedRef<ExportOption[]>
  exportDialogVisible,    // Ref<boolean>
  exporting,              // Ref<boolean>
  exportFetched,          // Ref<number>
  exportTotal,            // Ref<number>
  exportPercent,          // ComputedRef<number>
  exportCancelledVisible, // Ref<boolean>
  exportCancelledRows,    // Ref<number>
  onExportClick,          // () => void — auto-skips dialog when only one option is enabled
  doExport,               // (scope: ExportScope) => Promise<void>
  cancelExport,           // () => void
  keepPartialExport,      // () => Promise<void>
  discardPartialExport,   // () => Promise<void>
} = useExportExcel({
  props,          // reactive — dataFun/showCheckbox/exportorFunc auto-tracked
  meta: toRef(props, "meta"),
  columns: toRef(props, "columns"),
  rows: toRef(props, "rows"),
  selectedRows: toRef(props, "selectedRows"),
  total: toRef(props, "total"),
  innerPageSize: toRef(props, "innerPageSize"),
  showPagination: toRef(props, "showPagination"),
});

// Expose trigger so the parent's toolbar button can start the export flow
defineExpose({ trigger: onExportClick });
```

> **Why `toRef`?** Vue auto-unwraps `Ref` values passed as props, so `props.meta` is `Meta | null`, not `Ref<Meta | null>`. `toRef(props, "meta")` re-wraps it into a `Ref` that the composable can read via `.value`, preserving reactivity. The `columns`/`rows`/`total`/`showPagination` options accept `Ref<T>` (not strictly `ComputedRef<T>`), so both `computed()` results and `toRef()` wrappers work.

The parent component then only wires data inputs and calls `trigger()`:

```vue
<ExportExcelDialog
  v-if="showExportExcel"
  ref="exportDialogRef"
  :data-fun="props.dataFun"
  :show-checkbox="props.showCheckbox"
  :exportor-func="props.exportorFunc"
  :meta="meta"
  :columns="columns"
  :rows="rows"
  :selected-rows="selectedRows"
  :total="total"
  :inner-page-size="innerPageSize"
  :show-pagination="showPagination"
/>
<!-- toolbar button -->
<el-button v-if="showExportExcel" @click="exportDialogRef?.trigger()">⬇ 导出 Excel</el-button>
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

Tracks rows selected via checkbox. Designed for tables with `reserve-selection` so selection persists across pages.

```ts
const tableEl = ref<{ clearSelection?: () => void } | null>(null);

const {
  selectedRows,      // Ref<unknown[]> — cross-page accumulated selection
  onSelectionChange, // (selection: unknown[]) => void
  clearSelection,    // () => void — clears all pages
} = useSelection(tableEl);
```

## Relationship to other packages

```
┌─────────────────────────────────────────────────┐
│  @ys.knife.crud/element-plus  (.vue)   │  ← element-plus view layer
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
