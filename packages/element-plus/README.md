# @ys-knife-crud/element-plus

The **element-plus view layer** for `ys.knife.crud` — a set of Vue 3 + Element Plus components that render a full CRUD table (filter panel, command bar, table, column-settings dialog, Excel export dialog, …). All business logic lives in [`@ys-knife-crud/vue`](../vue); framework-agnostic contracts (`Meta`, `Column`, `Action`, `TableApi`, `ExportApi`, …) live in [`@ys-knife-crud/core`](../core).

## Installation

```bash
# pnpm
pnpm add @ys-knife-crud/element-plus @ys-knife-crud/core element-plus

# npm
npm install @ys-knife-crud/element-plus @ys-knife-crud/core element-plus
```

## Registering components

Two ways to use the components:

**Global registration** (use the whole suite as tags like `<ys-table-page>`):

```ts
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import YsCrudElementPlus from "@ys-knife-crud/element-plus";

const app = createApp(App);
app.use(ElementPlus);
app.use(YsCrudElementPlus); // registers YsTable / YsTablePage / YsFilterPanel / ... globally
app.mount("#app");
```

**Local import** (tree-shakeable, per-page):

```ts
import { YsTablePage, YsTextFilterItem } from "@ys-knife-crud/element-plus";
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
import type { TablePageDataFun } from "@ys-knife-crud/element-plus";
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
import { constData, Operator } from "@ys-knife-crud/core";
import { YsTablePage, YsTextFilterItem, type TablePageDataFun } from "@ys-knife-crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
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

---

## `openModal` — code-driven dialogs

A small service that mounts **any component** inside an `ElDialog` from plain code — no `<el-dialog v-model="...">` declaration in the template, no boolean ref to maintain. It is useful for row-action edit forms, one-off confirm forms, and any dialog whose trigger lives in an event handler (`Action.execute`, a command-bar button, a context-menu item, …).

```ts
import { openModal } from "@ys-knife-crud/element-plus";
```

> **Prerequisite — register the plugin.** The dialog is mounted imperatively, so it does **not** automatically inherit the calling component's app context. Install the plugin once at the app entry (`app.use(YsCrudElementPlus)`); otherwise `el-*` tags inside the dialog body render as unresolved custom elements and `inject()` returns `undefined`. See [App context](#app-context-inject--i18n--pinia) for details and the local-import fallback.

### Quick start

```ts
import { openModal } from "@ys-knife-crud/element-plus";
import UserEditForm from "./UserEditForm.vue";

openModal({
  title: "编辑用户",
  width: "600px",
  component: UserEditForm,
  props: { userId: 123 },
  // footer buttons are data-driven: pass actions to show them,
  // omit them (or pass []) for a footer-less dialog
  actions: [
    { name: "cancel", desc: "取消", execute: (handle) => handle.close() },
    {
      name: "save",
      desc: "保存",
      type: "primary",
      execute: async (handle) => {
        await saveUser();
        handle.close(); // closing is explicit — skip it (e.g. validation failed) to stay open
      },
    },
  ],
  onCancel: () => console.log("cancelled via ✕ / ESC / overlay"),
  onClosed: () => console.log("dialog destroyed"),
});
```

The content component only needs to render its body. An `onClose` listener is injected automatically, so `emit("close")` closes the dialog:

```vue
<!-- UserEditForm.vue -->
<script setup lang="ts">
import { ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";

defineProps<{ userId: number }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved", row: { name: string }): void;
}>();

const formRef = ref<FormInstance>();
const form = ref({ name: "" });
const rules: FormRules = { name: [{ required: true, message: "必填", trigger: "blur" }] };

// expose data/validation for the caller's footer actions (handle.getContentInstance())
defineExpose({
  validate: () => formRef.value?.validate(),
  getData: () => form.value,
});
</script>

<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.name" />
    </el-form-item>
  </el-form>
</template>
```

### Options (`ModalOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `component` | `Component` | — **required** | The component rendered as the dialog body. |
| `props` | `P` | — | Props forwarded to `component`. An `onClose` listener is always injected in addition. Vue 3 treats `onXxx` entries as event listeners, so a body `emit("saved", row)` is received via `props: { onSaved: (row) => … }`. |
| `title` | `string` | `""` | Dialog title (passed to `el-dialog`). |
| `width` | `string \| number` | `"500px"` | Dialog width. |
| `height` | `string \| number` | — | Fixed dialog height. When omitted the dialog grows with its content (default). When set, the dialog has a fixed height and the body scrolls internally when content overflows — the dialog will not be stretched by its content. Numbers are treated as pixels; strings may carry any unit (`"600px"`, `"70vh"`). |
| `actions` | `ModalAction[]` | — | Footer action buttons (取消 / 确定, …) rendered from data, same shape conventions as core's `TableAction`. Passing a **non-empty array renders the footer**; omitting it (or `[]`) renders **no footer** — the body then owns its buttons. While an action's `execute` promise is pending, that button shows a loading spinner, the other buttons are disabled and ✕ is hidden. See [Footer actions](#footer-actions-modalaction). |
| `onCancel` | `() => void` | — | Fired on any cancel-style close **not triggered by a footer action**: the ✕ icon, ESC (if enabled), or modal-click (if enabled). |
| `onClosed` | `() => void` | — | Fired after the close transition finishes and the dialog DOM has been destroyed. |
| `closeOnClickModal` | `boolean` | `false` | Clicking the overlay closes the dialog. Disabled by default to avoid losing form input. |
| `closeOnPressEscape` | `boolean` | `false` | ESC closes the dialog. Disabled by default. |
| `maximizable` | `boolean` | `false` | Show a maximize/restore button in the header (left of ✕). Maximized dialogs fill the viewport (`width:100%`, `height:100vh`) with the body scrolling internally. See [Maximize / restore](#maximize--restore). |
| `defaultMaximized` | `boolean` | `false` | Open already maximized. Only effective when `maximizable: true`. |
| `appContext` | `AppContext` | plugin default | Explicit app context for `inject` / global components inside the dialog. Usually unnecessary when the plugin is installed. |

### Returned handle (`ModalHandle`)

```ts
const handle = openModal({ component: MyForm });

handle.close();                          // close with transition, then destroy
handle.toggleMaximize();                 // switch between maximized/restored (needs maximizable)
handle.isMaximized();                    // boolean: current maximize state
handle.getContentInstance();             // the mounted body component instance,
                                         // so you can call its defineExpose() methods
```

### Footer actions (`ModalAction`)

The built-in footer is **data-driven**: every entry in `actions` renders as an `el-button`, with the same shape conventions as core's `TableAction` — `name` is the key, `desc` is the visible button label (and `title` tooltip), `icon` / `type` map to the button like `Action.icon` does elsewhere.

```ts
import { openModal, type ModalAction } from "@ys-knife-crud/element-plus";

const actions: ModalAction[] = [
  { name: "cancel", desc: "取消", execute: (handle) => handle.close() },
  {
    name: "save",
    desc: "保存",
    type: "primary",      // el-button type; 'default' / undefined → plain default button
    // icon: EditPen,     // same compatibility as Action.icon (component / VNode)
    execute: async (handle, form) => {
      // form is auto-typed as InstanceType<typeof UserEditForm> (non-null)
      try {
        await form.validate();
      } catch {
        return;           // validation failed → don't close, the dialog stays open
      }
      await api.update(form.getData());
      handle.close();     // closing is explicit — call it when the action succeeded
    },
  },
];

openModal({ component: UserEditForm, actions });
```

Behavior:

- **A non-empty `actions` array renders the footer; omitting it (or `[]`) renders no footer** — the body component then owns its buttons and closes via `emit("close")`.
- `execute(handle, instance)` receives the [dialog handle](#returned-handle-modalhandle) and the mounted body component instance. The instance type is **auto-inferred from `component`** (e.g. `InstanceType<typeof UserEditForm>`) and is non-null (footer buttons are only clickable after the body mounts). Closing is **explicit** (`handle.close()`), which makes "keep the dialog open on validation failure" trivial — just don't call `close`.
- While `execute` returns a pending promise: that button shows `loading`, the other action buttons are disabled, the ✕ icon is hidden, and further clicks are ignored — no half-submitted close.
- `onCancel` is **not** called for footer actions; it only covers non-action close paths (✕ / ESC / overlay).

> A common alternative that avoids `getContentInstance()` is to omit `actions` and have the body component own its buttons, calling the API itself, then `emit("close")` on success.

### No actions (body owns the buttons)

For multi-step forms, dynamic button labels, or cases where the body already has a button bar, just omit `actions`:

```ts
openModal({
  title: "详情",
  component: DetailPanel,
  props: { id },
  // no actions → no built-in footer
});
```

The body can then render its own buttons and close via the injected `onClose`:

```vue
<template>
  <div class="detail">…</div>
  <div class="footer">
    <el-button @click="emit('close')">关闭</el-button>
    <el-button type="primary" @click="submitAndClose">保存</el-button>
  </div>
</template>
```

### `openDialog` — built-in 取消 / 确定 footer

`openDialog` is a thin convenience wrapper around `openModal` that provides a built-in **取消 / 确定** footer by default — you only supply `onConfirm`:

```ts
import { openDialog } from "@ys-knife-crud/element-plus";

openDialog({
  title: "编辑用户",
  width: "600px",
  component: UserEditForm,
  props: { userId: 123 },
  onConfirm: async (_handle, form) => {
    // form is auto-typed as InstanceType<typeof UserEditForm> (non-null)
    const ok = await form.validate().catch(() => false);
    if (!ok) return false;   // validation failed → return false to keep the dialog open
    await api.update(form.getData());
    // returning undefined (or any non-false value) closes the dialog
  },
});
```

Semantics:

- **取消** closes the dialog immediately. (Use `onCancel` only for non-button close paths like ✕ / ESC / overlay; the 取消 button does not fire it.)
- **确定** runs `onConfirm(handle, instance)`. While it is pending, 确定 shows `loading`, 取消 and ✕ are disabled/hidden. Return `false` (or a promise resolving to `false`) to **keep the dialog open**; any other return value closes it.
- `confirmText` / `cancelText` / `confirmType` customize the default 取消 / 确定 buttons.
- The footer buttons are fixed at 取消 / 确定. Need a different button set (e.g. three buttons, a custom action)? Use `openModal` with `actions`.

All other `openModal` options (`maximizable`, `closeOnClickModal`, `onClosed`, …) are available on `openDialog` as well.

### Fixed height

By default the dialog grows with its content. For content with a known height budget (a table with many rows, a long log panel, …), pass `height` to cap the dialog. Numbers are pixels; strings carry any unit:

```ts
openDialog({
  title: "用户列表",
  width: "900px",
  height: 500,            // or "600px" / "70vh"
  component: UserTable,
  maximizable: true,
});
```

Behavior:

- **Without `height`** — the dialog height follows its content (default Element Plus behavior).
- **With `height`** — the dialog is fixed to that height. `.el-dialog__body` becomes `flex:1` with `overflow:auto`, so overflowing content scrolls inside the dialog instead of stretching it. Header and footer stay fixed.
- **With `maximizable`** — maximize still wins (`height: 100vh !important`); restoring returns to the `height` you set.

### Maximize / restore

For forms/detail panels whose content is cramped at the default width, set `maximizable: true` to show a maximize button in the header (immediately left of ✕). Clicking it toggles between the normal `width` size and a viewport-filling layout; clicking again restores.

```ts
openModal({
  title: "订单详情",
  width: "520px",          // size when restored
  component: OrderDetail,
  props: { orderId },
  maximizable: true,      // show the maximize/restore button
  // defaultMaximized: true, // optional: open already maximized
});
```

Behavior and layout:

- **Restored** — the dialog uses your `width` exactly like a normal dialog.
- **Maximized** — `width: 100%`, `height: 100vh`, top-aligned (no margin). The header and footer stay fixed while `.el-dialog__body` becomes `flex:1` with `overflow:auto`, so long content scrolls inside the dialog rather than the page.
- The button icon switches between a single frame (maximize) and overlapping frames (restore), with `title`/`aria-label` tooltips.
- The maximize state is internal to the service; the body component is not re-created on toggle (its state, e.g. partially filled form, is preserved).

You can also drive it programmatically through the returned handle:

```ts
const handle = openModal({ component: WideForm, maximizable: true });

// e.g. inside the body or an external toolbar:
if (!handle.isMaximized()) handle.toggleMaximize();
```

> The maximize button shares the same positioning context (`.el-dialog`) as Element Plus's built-in ✕, so the close button stays in exactly the same place whether or not `maximizable` is enabled.

### Using from a row action

The most common use in this library: an `Action.execute(row, table)` opens an edit form for the clicked row and refreshes the table after a successful save. Pass the row through `props`, and call `table.refresh()` (current page only) or `table.reload()` (back to page 1) after the dialog closes:

```ts
import { constActions, type RowActionsFunc } from "@ys-knife-crud/core";
import { openModal } from "@ys-knife-crud/element-plus";
import UserEditForm from "./UserEditForm.vue";

const rowActionsFunc: RowActionsFunc<UserRow> = constActions<UserRow>({
  name: "edit",
  desc: "编辑",
  execute: (row, table) => {
    openModal({
      title: `编辑：${row.name}`,
      component: UserEditForm,
      // seed the form from the clicked row; the body initialises from props
      props: { initialName: row.name, initialEmail: row.email },
      actions: [
        { name: "cancel", desc: "取消", execute: (handle) => handle.close() },
        {
          name: "save",
          desc: "保存",
          type: "primary",
          execute: async (handle, form) => {
            try {
              await form.validate();
            } catch {
              return; // stay open on validation failure
            }
            await updateUser(row.id, form.getData());
            table.refresh(); // re-fetch the current page after saving
            handle.close();
          },
        },
      ],
    });
    return Promise.resolve();
  },
});
```

> `execute` is called outside the Vue component tree (it is just a callback), which is exactly why `openModal` captures the app context from the plugin install rather than from the call site. There is no `getCurrentInstance()` available inside `execute`.

### App context (inject / i18n / pinia)

Because the dialog is mounted imperatively, it does not automatically inherit the calling component's app context. After registering the plugin (`app.use(YsCrudElementPlus)`), the application context is captured during `install` and used by every `openModal` call, so `inject`, global components, directives, `ElConfigProvider` locale, Pinia, etc. work inside dialog bodies with no extra setup. If you use local imports without the plugin, capture the context **inside `setup`** and pass it explicitly — `getCurrentInstance()` returns `null` inside the later event handler:

```ts
// inside <script setup>: capture once, use in handlers
import { getCurrentInstance } from "vue";

const appContext = getCurrentInstance()!.appContext;

function openEdit() {
  openModal({ component: MyForm, appContext });
}
```

**Troubleshooting — missing app context.** When neither the plugin nor an explicit `appContext` is available, `openModal` prints a console warning and the dialog body renders `el-*` tags as **unresolved custom elements** — inspecting the DOM shows literal `<el-form>` / `<el-input>` nodes instead of `<form class="el-form">`, and the inputs never appear. `inject()` inside the body also returns `undefined`. Fix it by installing the plugin in the app entry, or pass `appContext` as shown above.

### Notes & gotchas

- **Register the plugin (or pass `appContext`).** This is the single most common failure: imperative `render()` does not inherit the caller's component tree, so without an app context the dialog shell (`ElDialog`, imported directly by the service) works but every globally-registered component inside the **body** silently fails to resolve. See [App context](#app-context-inject--i18n--pinia).
- **Cleanup is automatic.** The service listens to `el-dialog`'s `closed` event and calls `render(null, container)` + removes the mount node after the leave transition. Reopening later creates a fresh instance — do not reuse the container yourself.
- **Teleport still applies.** `el-dialog` teleports to `<body>` as usual; the internal mount node is only the vnode anchor, so dialogs are not trapped inside an `overflow:hidden` parent.
- **`destroy-on-close` is always on.** Body component state is not retained across close/reopen; initialise from `props` synchronously (e.g. `reactive({ name: props.initialName ?? "" })`) or fetch by id in `onMounted`.
- **Footer buttons are opt-in via `actions`.** No `actions` (or an empty array) renders no footer — the body component owns its buttons and closes via `emit("close")`. `onCancel` only fires for non-action close paths (✕ / ESC / overlay), never for footer action clicks.
- **Prefer it for dialogs triggered from handlers.** For dialogs whose open state is naturally bound to template state (e.g. a panel-level edit dialog co-located with a table), a plain `<el-dialog v-model>` is still the simpler choice.

A runnable, eight-scenario demo (footer actions with async validation / no-actions body-owned buttons / `props.onXxx` event forwarding / `openDialog` with built-in 取消·确定 / maximizable toggle / open maximized by default / `openDialog` embedding `YsTablePage` / `openDialog` embedding `YsImportExcel`) lives in [`packages/element-plus-demo/src/pages/modal`](./packages/element-plus-demo/src/pages/modal); run `pnpm --filter @ys-knife-crud/element-plus-demo dev` and open **代码式弹窗（openModal）**.

---

## Relationship to other packages

```
┌─────────────────────────────────────────────┐
│  your app                                    │
└───────────────────┬─────────────────────────┘
                    │ uses
                    ▼
┌─────────────────────────────────────────────┐
│  @ys-knife-crud/element-plus  (.vue)        │  ← this package
└───────────────────┬─────────────────────────┘
                    │ consumes
                    ▼
┌─────────────────────────────────────────────┐
│  @ys-knife-crud/vue  (composables)          │
└───────────────────┬─────────────────────────┘
                    │ depends on
                    ▼
┌─────────────────────────────────────────────┐
│  @ys-knife-crud/core  (contracts & types)   │
└─────────────────────────────────────────────┘

         @ys-knife-crud/export-exceljs
         (ExportApi implementation, injected as exportorFunc)
```

## License

MIT.
