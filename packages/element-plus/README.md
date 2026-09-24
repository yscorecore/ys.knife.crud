# @ys.knife.crud/element-plus

The **element-plus view layer** for `ys.knife.crud` — a set of Vue 3 + Element Plus components that render a full CRUD table (filter panel, command bar, table, column-settings dialog, Excel export dialog, …). All business logic lives in [`@ys.knife.crud/vue`](../vue); framework-agnostic contracts (`Meta`, `Column`, `Action`, `TableApi`, `ExportApi`, …) live in [`@ys.knife.crud/core`](../core).

## Installation

```bash
# pnpm
pnpm add @ys.knife.crud/element-plus @ys.knife.crud/core element-plus

# npm
npm install @ys.knife.crud/element-plus @ys.knife.crud/core element-plus
```

## Registering components

Two ways to use the components:

**Global registration** (use the whole suite as tags like `<ys-table-page>`):

```ts
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import YsCrudElementPlus from "@ys.knife.crud/element-plus";

const app = createApp(App);
app.use(ElementPlus);
app.use(YsCrudElementPlus); // registers YsTable / YsTablePage / YsFilterPanel / ... globally
app.mount("#app");
```

**Local import** (tree-shakeable, per-page):

```ts
import { YsTablePage, YsTextFilterItem } from "@ys.knife.crud/element-plus";
// now <ys-table-page> / <YsTablePage> resolves in this SFC's template
```

---

## `YsTablePage`

A **three-in-one composition component**: `YsFilterPanel` + `YsCommandBar` + `YsTable`, stacked vertically. It removes the boilerplate of manually wiring the three pieces together and **auto-wires the filter panel's query conditions into the table's data loading** — the most repetitive part of the manual combination.

```
┌─────────────────────────────────────────────┐
│  YsFilterPanel  (filter items + 查询/重置)    │  ← default slot
├─────────────────────────────────────────────┤
│  YsCommandBar   (actions + 选中提示条 + ⋮下拉) │  ← #command-bar slot
├─────────────────────────────────────────────┤
│  YsTable        (table / card / list + 分页)  │  ← #card #list #empty #loading #footer
└─────────────────────────────────────────────┘
```

### How the auto-wiring works

`YsTablePage` holds the current `FilterInfo` internally. On `filterPanel @search` it updates that filter and calls `table.reload()` (back to page 1); on `@reset` it clears the filter and reloads. Your `dataFun` therefore receives the **current filter as a parameter** and never has to close over a reactive ref yourself.

This means `YsTablePage`'s `dataFun` uses an **augmented signature** (one extra `filter` arg) compared to core's `PageFunc`:

```ts
import type { TablePageDataFun } from "@ys.knife.crud/element-plus";
// TablePageDataFun = (req, filter, signal?) => Promise<PagedList<unknown>>

const dataFun: TablePageDataFun = async (req, filter, signal) => {
  // Hand `filter` to your backend, or evaluate it client-side.
  // `req` is { limit, offset }; return a PagedList.
  return await fetchPaged("/api/users", { ...req, filter }, signal);
};
```

`YsTablePage` adapts this to the plain `PageFunc` that `YsTable` expects by binding its internal current filter. The adapted function is recomputed **only** when your `dataFun` reference changes (so pass a stable `const`, see notes below) — the filter is read at call time, and reloads are driven by the explicit `reload()` on search/reset.

### Minimal example

```vue
<script setup lang="ts">
import { constData, Operator } from "@ys.knife.crud/core";
import { YsTablePage, YsTextFilterItem, type TablePageDataFun } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import { metaFun, type UserRow } from "./meta";        // your MetaFunc
import { allRows } from "./data";                       // your source rows

const exportorFunc = createExcelJsExportApiFunc();

// Augmented dataFun: filter comes in as a FilterInfo. Here we evaluate a single
// "name contains X" condition client-side; in real apps you usually forward
// `filter` to the backend instead.
const dataFun: TablePageDataFun = (req, filter) => {
  const rows = applyFilter(allRows, filter); // your filter→rows logic
  return constData(rows)(req);
};
</script>

<template>
  <ys-table-page
    :meta-fun="metaFun"
    :data-fun="dataFun"
    :page-size="10"
    show-checkbox
    :exportor-func="exportorFunc"
    style="height: 100%"
  >
    <!-- filter items → YsFilterPanel default slot -->
    <ys-text-filter-item label="姓名" property-path="name" :op="Operator.Contains" placeholder="输入姓名片段" />

    <!-- table view slots are forwarded as-is -->
    <template #card="{ row }">
      <div class="card">{{ row.name }} · {{ row.email }}</div>
    </template>
  </ys-table-page>
</template>
```

### Props

All props of the three wrapped components are **flattened** onto `YsTablePage` (no name collisions). They fall into three groups:

#### Table (forwarded to `YsTable`)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `metaFun` | `MetaFunc` | — **required** | Async column-metadata loader. |
| `dataFun` | `TablePageDataFun` | — **required** | **Augmented** data loader `(req, filter, signal) => Promise<PagedList>`. The `filter` arg is injected from the filter panel. |
| `rowActionsFunc` | `RowActionsFunc` | — | Optional per-row action loader. |
| `pageSize` | `number` | `20` | Initial page size. |
| `pageSizes` | `number[]` | `[10,20,50,100]` | Page-size dropdown options. |
| `showCheckbox` | `boolean` | `false` | Show the selection column. `v-model:show-checkbox`. |
| `columnResizable` | `boolean` | `true` | Allow dragging column borders. `v-model:column-resizable`. |
| `loadCustomConfigFun` | `loadCustomConfigFunc` | — | Load saved column config / default page size. |
| `saveCustomConfigFun` | `saveCustomConfigFunc` | — | Persist column config / default page size. |
| `exportPageSize` | `number` | `1000` | Page size used while streaming "export all". |
| `exportorFunc` | `ExportApiFunc` | — | Export implementation factory (e.g. `createExcelJsExportApiFunc()`). Falls back to a console stub. |
| `rowKey` | `string` | `"id"` | Row identity field (drives cross-page selection). |
| `viewMode` | `"table" \| "card" \| "list"` | `"table"` | Active view. `v-model:view-mode`. |

#### Command bar (forwarded to `YsCommandBar`)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `actions` | `TableAction[]` | `[]` | Table-level commands rendered as buttons on the left (each `execute(table)` receives the internal `TableApi`). |
| `showActionMenuButton` | `boolean` | `true` | Show the built-in right-aligned ⋮ dropdown (refresh / export / column settings / view switch / select / column resize). |

#### Filter panel (forwarded to `YsFilterPanel`)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `showSearch` | `boolean` | `true` | Render the built-in 查询 button. |
| `showReset` | `boolean` | `true` | Render the built-in 重置 button. |
| `searchButtonText` | `string` | `"查询"` | Search button text. |
| `resetButtonText` | `string` | `"重置"` | Reset button text. |
| `enableAdvancedFilter` | `boolean` | `false` | Enable switching to the built-in advanced-filter panel. |
| `advancedColumns` | `Column[]` | `[]` | Fields available to the advanced filter (required when `enableAdvancedFilter`). |
| `advancedOptionSources` | `Record<string, EnumOptionsSource>` | — | Enum data sources for advanced filter fields, keyed by `propertyPath`. |
| `showQuickQuery` | `boolean` | `false` | Show saved-query tags in simple mode. |
| `quickQueries` | `SavedQuery[]` | `undefined` | Saved-query list. `v-model:quick-queries`. |
| `loadQuickQueryFun` | `() => Promise<SavedQuery[]>` | — | Async loader for saved queries (auto-called on mount). |
| `saveQuickQueryFun` | `(q: SavedQuery) => Promise<void \| SavedQuery>` | — | Async persister for new saved queries. |
| `singleLine` | `boolean` | `false` | Collapse overflow filter items into one line with an expand toggle. |

### Events

All events from the wrapped components are re-emitted, so `v-model` works through `YsTablePage`:

| Event | Payload | Description |
| --- | --- | --- |
| `search` | `FilterInfo` | Filter panel search submitted. `YsTablePage` has **already** reloaded the table; this is for external awareness only. |
| `reset` | — | Filter panel reset. `YsTablePage` has **already** cleared + reloaded. |
| `update:quickQueries` | `SavedQuery[]` | `v-model:quick-queries` update. |
| `data-loaded` | `PagedList` | Table finished loading a page. |
| `update:viewMode` | `ViewMode` | `v-model:view-mode` update. |
| `update:showCheckbox` | `boolean` | `v-model:show-checkbox` update. |
| `update:columnResizable` | `boolean` | `v-model:column-resizable` update. |

### Slots

| Slot | Scope | Forwarded to | Description |
| --- | --- | --- | --- |
| default | — | `YsFilterPanel` default | Filter items (`YsTextFilterItem` / `YsDateFilterItem` / `YsEnumFilterItem` / …). |
| `command-bar` | — | `YsCommandBar` default | Extra content appended after the command buttons / selection bar. |
| `card` | `{ row, index }` | `YsTable #card` | Card-view content per row. |
| `list` | `{ row, index }` | `YsTable #list` | List-view content per row. |
| `empty` | — | `YsTable #empty` | Custom empty-state content. |
| `loading` | — | `YsTable #loading` | Custom loading overlay. |
| `footer` | — | `YsTable #footer` | Extra footer content (left of the paginator). |

### Exposed API

Via a template ref, `YsTablePage` exposes the internal instances for advanced external control:

```ts
const pageRef = ref<{
  table: TableApi | null;        // the internal YsTable instance
  filterPanel: {                 // the internal YsFilterPanel instance
    filter: ComputedRef<FilterInfo>;
    reset: () => void;
    mode: Ref<"simple" | "advanced">;
  } | null;
} | null>(null);

pageRef.value?.table?.refresh();        // refresh current page (keeps filter/page)
pageRef.value?.table?.openConfigDialog(); // open column-settings dialog
pageRef.value?.filterPanel?.mode.value;   // read current filter mode
```

You normally don't need this — `actions` receive the `TableApi` automatically, and search/reset are wired for you. Reach for it only when external code must drive the table or read filter state.

### Layout & fill-height

`YsTablePage` is a vertical flex column (`display:flex; flex-direction:column`) that fills its parent. The filter panel and command bar are `flex-shrink:0`; the table area is `flex:1; min-height:0` with the inner `YsTable` set to `height:100%`. Give `YsTablePage` a height (e.g. `style="height:100%"` inside a sized parent, or `100vh`) and the table content scrolls while the filter panel, command bar, and paginator stay fixed.

### Notes & gotchas

- **Keep `dataFun` a stable `const`.** `YsTablePage` adapts it with a `computed` that recomputes when the `dataFun` reference changes; an inline arrow `:data-fun="(req,filter) => …"` recreates every render and reloads the table each time. Declare it as a `const` in `<script setup>` (same convention as `YsTable`).
- **Search reloads from page 1 via `table.reload()`.** `reload()` re-fetches meta / row actions / column config in addition to data. This is harmless for most apps; if you need a lighter "data-only page-1 reload", call `pageRef.value?.table?.refresh()` after programmatically driving the filter instead.
- **`FilterInfo` has no public evaluator.** `core` exposes `FilterInfo` with `toString()` / `isEmpty()` / `andAlso` / `orElse` only (its fields are protected). For client-side evaluation you'd parse `filter.toString()` (single-condition format: `"propertyPath op value"`, e.g. `"name contains 张"`). In real apps, forward `filter` to your backend query API rather than evaluating it in the browser.
- **`dataFun`'s filter is read at call time.** `YsTablePage` stores the current filter in a `shallowRef<FilterInfo>`; the adapted `PageFunc` reads it when the table calls it, so page changes / refreshes always use the latest active filter.

### Other components

The package also exports the individual building blocks for when you need finer control than `YsTablePage`: `YsTable`, `YsFilterPanel` (+ `YsTextFilterItem` / `YsDateFilterItem` / `YsDateRangeFilterItem` / `YsEnumFilterItem` / `YsFilterItemLayout`), `YsCommandBar`, `YsTableActionMenuButton`, `YsMainPanel`, and the advanced-filter trio (`YsAdvancedFilterPanel` / `YsAdvancedValueEditor` / `YsAdvancedConditionGroup`). `YsTablePage` is the recommended starting point; drop down to the primitives only when its fixed layout doesn't fit.

## Relationship to other packages

```
┌─────────────────────────────────────────────┐
│  your app                                    │
└───────────────────┬─────────────────────────┘
                    │ uses
                    ▼
┌─────────────────────────────────────────────┐
│  @ys.knife.crud/element-plus  (.vue)        │  ← this package
└───────────────────┬─────────────────────────┘
                    │ consumes
                    ▼
┌─────────────────────────────────────────────┐
│  @ys.knife.crud/vue  (composables)          │
└───────────────────┬─────────────────────────┘
                    │ depends on
                    ▼
┌─────────────────────────────────────────────┐
│  @ys.knife.crud/core  (contracts & types)   │
└─────────────────────────────────────────────┘

         @ys.knife.crud/export-exceljs
         (ExportApi implementation, injected as exportorFunc)
```

## License

MIT.
