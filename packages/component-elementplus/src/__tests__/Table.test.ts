import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Table from "../Table.vue";
import {
  constData,
  type Action,
  type CustomColumnConfigs,
  type Meta,
  type MetaFunc,
  type PageFunc,
  type RowActionsFunc,
} from "@ys.knife.crud/core";

function makeColumn(propertyPath: string, displayName: string, displayOrder: number, showForDisplay = true) {
  return {
    propertyPath,
    displayName,
    description: null,
    showForDisplay,
    displayFormat: null,
    isArray: false,
    dataTypeName: "string",
    displayOrder,
    dataSource: null,
    queryFilter: null,
  };
}

const meta: Meta = {
  displayName: "用户列表",
  description: null,
  columns: [
    makeColumn("name", "姓名", 1),
    makeColumn("id", "ID", 0),
    makeColumn("secret", "隐藏列", 2, false),
  ],
};

const metaFun: MetaFunc = () => Promise.resolve(meta);

const rows = [
  { id: 1, name: "Alice", secret: "x" },
  { id: 2, name: "Bob", secret: "y" },
];

const dataFun: PageFunc<unknown> = constData(rows);

// el-table stub：通过 provide 把当前行数据以函数形式暴露给列 stub
// （函数在列渲染时求值，保证数据异步加载后列能拿到最新 rows）。
// 内置 select-all / clear-selection 按钮模拟表头全选与取消全选；
// 必须声明 emits，否则父组件的 @selection-change 会变成透传原生监听而收不到。
const ElTableStub = {
  name: "ElTable",
  template:
    '<div class="el-table-stub">' +
    '<button class="select-all" @click="$emit(\'selection-change\', data ?? [])">all</button>' +
    '<button class="clear-selection" @click="$emit(\'selection-change\', [])">clear</button>' +
    '<slot /></div>',
  props: ["data", "rowKey"],
  emits: ["selection-change"],
  methods: {
    // 组件的「清空」按钮通过 ref 调用此方法（与 el-table 的 clearSelection 对齐）
    clearSelection(this: { $emit: (e: string, v: unknown[]) => void }) {
      this.$emit("selection-change", []);
    },
  },
  provide(this: { data?: unknown[] }) {
    return { tableRows: (): unknown[] => this.data ?? [] };
  },
};

// el-table-column stub：渲染列头文本，并对每一行调用默认插槽（供操作列使用）
const ElTableColumnStub = {
  name: "ElTableColumn",
  template:
    '<div class="col" :data-prop="prop" :data-type="type" :data-width="width">{{ label }}' +
    '<template v-for="(r, i) in tableRows()" :key="i"><slot :row="r" /></template></div>',
  props: ["prop", "label", "type", "width"],
  inject: ["tableRows"],
};

// el-dialog stub：modelValue 为 true 时才渲染内容（避开真实组件的 teleport）
const ElDialogStub = {
  name: "ElDialog",
  template:
    '<div v-if="modelValue" class="el-dialog-stub"><slot />' +
    '<div class="dialog-footer"><slot name="footer" /></div></div>',
  props: ["modelValue", "title"],
  emits: ["update:modelValue"],
};

// el-checkbox stub：v-model 双向绑定勾选状态
const ElCheckboxStub = {
  name: "ElCheckbox",
  template:
    '<label class="el-checkbox-stub">' +
    '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />' +
    '<slot /></label>',
  props: ["modelValue"],
  emits: ["update:modelValue"],
};

// el-input stub：v-model 双向绑定文本
const ElInputStub = {
  name: "ElInput",
  template:
    '<input class="el-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ["modelValue", "placeholder"],
  emits: ["update:modelValue"],
};

// el-button stub：必须声明 emits，否则父组件 @click 会重复触发（事件透传 + 组件事件）
const ElButtonStub = {
  name: "ElButton",
  template: '<button class="act" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  props: ["disabled"],
  emits: ["click"],
};

// el-pagination stub：暴露 total/pageSize/currentPage 为 data 属性，
// 内置 next 按钮触发 current-change 模拟翻页、size-20 按钮触发 size-change 模拟切换每页条数
const ElPaginationStub = {
  name: "ElPagination",
  template:
    '<div class="el-pagination-stub" :data-total="total" :data-page-size="pageSize" :data-current-page="currentPage" :data-page-sizes="pageSizes">' +
    '<button class="next-page" @click="$emit(\'current-change\', currentPage + 1)">next</button>' +
    '<button class="size-20" @click="$emit(\'size-change\', 20)">20/page</button></div>',
  props: ["total", "pageSizes", "pageSize", "currentPage"],
  emits: ["current-change", "size-change"],
};

const stubs = {
  "el-table": ElTableStub,
  "el-table-column": ElTableColumnStub,
  "el-button": ElButtonStub,
  "el-pagination": ElPaginationStub,
  "el-dialog": ElDialogStub,
  "el-checkbox": ElCheckboxStub,
  "el-input": ElInputStub,
};

function mountTable(props: Record<string, unknown> = {}) {
  return mount(Table, {
    props: { metaFun, dataFun, ...props },
    global: {
      directives: { loading: {} },
      stubs,
    },
  });
}

describe("Table", () => {
  it("renders visible columns from metaFun, sorted by displayOrder", async () => {
    const wrapper = mountTable();

    await flushPromises();

    const cols = wrapper.findAll(".col");
    const labels = cols.map((c) => c.text());
    const props = cols.map((c) => c.attributes("data-prop"));

    // showForDisplay: false 的 "隐藏列" 被过滤，其余按 displayOrder 排序：ID(0) -> 姓名(1)
    expect(labels).toEqual(["ID", "姓名"]);
    expect(props).toEqual(["id", "name"]);
    expect(wrapper.text()).not.toContain("隐藏列");
  });

  it("loads rows via dataFun and passes them to the underlying table", async () => {
    const wrapper = mountTable();

    await flushPromises();

    const tableStub = wrapper.findComponent(ElTableStub);
    expect(tableStub.props("data")).toEqual(rows);
  });

  it("calls dataFun with a paged request (limit/offset)", async () => {
    const spy = vi.fn(constData(rows));
    mountTable({ dataFun: spy });

    await flushPromises();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatchObject({ limit: 20, offset: 0 });
  });

  it("reloads data when dataFun changes", async () => {
    const wrapper = mountTable();
    await flushPromises();

    const newRows = [{ id: 3, name: "Carol", secret: "z" }];
    await wrapper.setProps({ dataFun: constData(newRows) });
    await flushPromises();

    const tableStub = wrapper.findComponent(ElTableStub);
    expect(tableStub.props("data")).toEqual(newRows);
  });

  it("does not render the actions column without rowActionsFunc", async () => {
    const wrapper = mountTable();

    await flushPromises();

    expect(wrapper.text()).not.toContain("操作");
    expect(wrapper.findAll("button.act").length).toBe(0);
  });
});

describe("Table pagination", () => {
  // 25 行数据，pageSize=10 时共 3 页
  const manyRows = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `User${i + 1}`,
    secret: `s${i + 1}`,
  }));

  it("hides pagination when data fits in one page", async () => {
    const wrapper = mountTable(); // 默认 rows 只有 2 行，pageSize 20

    await flushPromises();

    expect(wrapper.find(".el-pagination-stub").exists()).toBe(false);
  });

  it("shows pagination with total when data exceeds one page", async () => {
    const wrapper = mountTable({ dataFun: constData(manyRows), pageSize: 10 });

    await flushPromises();

    const pager = wrapper.find(".el-pagination-stub");
    expect(pager.exists()).toBe(true);
    expect(pager.attributes("data-total")).toBe("25");
    expect(pager.attributes("data-page-size")).toBe("10");
    expect(pager.attributes("data-current-page")).toBe("1");
    // 第一页只渲染前 10 行
    expect(wrapper.findComponent(ElTableStub).props("data")).toEqual(manyRows.slice(0, 10));
  });

  it("requests the next page with the correct offset on page change", async () => {
    const spy = vi.fn(constData(manyRows));
    const wrapper = mountTable({ dataFun: spy, pageSize: 10 });
    await flushPromises();

    await wrapper.find("button.next-page").trigger("click");
    await flushPromises();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]?.[0]).toMatchObject({ limit: 10, offset: 10 });
    expect(wrapper.findComponent(ElTableStub).props("data")).toEqual(manyRows.slice(10, 20));
    expect(wrapper.find(".el-pagination-stub").attributes("data-current-page")).toBe("2");
  });

  it("resets to the first page when dataFun changes", async () => {
    const spy = vi.fn(constData(manyRows));
    const wrapper = mountTable({ dataFun: spy, pageSize: 10 });
    await flushPromises();
    await wrapper.find("button.next-page").trigger("click");
    await flushPromises();

    await wrapper.setProps({ dataFun: constData(manyRows) });
    await flushPromises();

    expect(wrapper.find(".el-pagination-stub").attributes("data-current-page")).toBe("1");
    expect(wrapper.findComponent(ElTableStub).props("data")).toEqual(manyRows.slice(0, 10));
  });

  it("passes pageSizes options to the pagination component", async () => {
    const wrapper = mountTable({ dataFun: constData(manyRows), pageSize: 10, pageSizes: [10, 30] });

    await flushPromises();

    expect(wrapper.find(".el-pagination-stub").attributes("data-page-sizes")).toBe("10,30");
  });

  it("requests data with the new limit and resets to page 1 on size change", async () => {
    const spy = vi.fn(constData(manyRows));
    const wrapper = mountTable({ dataFun: spy, pageSize: 10 });
    await flushPromises();
    // 先翻到第 2 页，验证切换每页条数后会回到第 1 页
    await wrapper.find("button.next-page").trigger("click");
    await flushPromises();

    await wrapper.find("button.size-20").trigger("click");
    await flushPromises();

    const lastCall = spy.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ limit: 20, offset: 0 });
    expect(wrapper.findComponent(ElTableStub).props("data")).toEqual(manyRows.slice(0, 20));
    const pager = wrapper.find(".el-pagination-stub");
    expect(pager.attributes("data-current-page")).toBe("1");
    expect(pager.attributes("data-page-size")).toBe("20");
  });

  it("keeps pagination visible after switching to a size larger than total", async () => {
    // 15 行：默认每页 10 条时分页显示；切到每页 20 条后一页装得下，
    // 但分页组件应保持可见（否则用户无法切回来）
    const fifteenRows = manyRows.slice(0, 15);
    const wrapper = mountTable({ dataFun: constData(fifteenRows), pageSize: 10 });
    await flushPromises();

    await wrapper.find("button.size-20").trigger("click");
    await flushPromises();

    expect(wrapper.findComponent(ElTableStub).props("data")).toEqual(fifteenRows);
    expect(wrapper.find(".el-pagination-stub").exists()).toBe(true);
  });
});

describe("Table checkbox selection", () => {
  it("does not render a selection column by default", async () => {
    const wrapper = mountTable();

    await flushPromises();

    expect(wrapper.find('[data-type="selection"]').exists()).toBe(false);
  });

  it("renders the selection column as the first column when showCheckbox is true", async () => {
    const wrapper = mountTable({ showCheckbox: true });

    await flushPromises();

    const cols = wrapper.findAll(".col");
    expect(cols[0]?.attributes("data-type")).toBe("selection");
    // 其余数据列保持原顺序
    expect(cols.slice(1).map((c) => c.attributes("data-prop"))).toEqual(["id", "name"]);
  });

  it("tracks header select-all and clear via selection-change", async () => {
    const wrapper = mountTable({ showCheckbox: true });
    await flushPromises();

    // 表头全选
    await wrapper.find("button.select-all").trigger("click");
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toEqual(rows);

    // 取消全选
    await wrapper.find("button.clear-selection").trigger("click");
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toEqual([]);
  });

  it("marks the selection column with reserve-selection so selection survives paging", async () => {
    const wrapper = mountTable({ showCheckbox: true });

    await flushPromises();

    // reserve-selection 未声明为 stub 的 prop，作为 fallthrough attribute 落在列元素上
    const selectionCol = wrapper.find('[data-type="selection"]');
    expect(selectionCol.attributes("reserve-selection")).toBeDefined();
  });

  it("shows a selection bar with count and clears selection from it", async () => {
    const wrapper = mountTable({ showCheckbox: true });
    await flushPromises();

    // 初始无选中，不显示提示条
    expect(wrapper.find(".yk-table__selection-bar").exists()).toBe(false);

    // 全选后出现提示条并显示数量
    await wrapper.find("button.select-all").trigger("click");
    const bar = wrapper.find(".yk-table__selection-bar");
    expect(bar.exists()).toBe(true);
    expect(bar.text()).toContain(`已选 ${rows.length} 项`);

    // 点击提示条的「清空」：经 tableEl.clearSelection() 走 selection-change 同步
    await bar.find("button.act").trigger("click");
    expect(wrapper.find(".yk-table__selection-bar").exists()).toBe(false);
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toEqual([]);
  });
});

describe("Table custom column config", () => {
  function cfgOf(partial: { propertyPath: string; visible?: boolean; order?: number; width?: string }) {
    return { visible: true, order: 0, width: "", ...partial };
  }

  it("does not show the config entry by default", async () => {
    const wrapper = mountTable();

    await flushPromises();

    expect(wrapper.find(".yk-table__config-btn").exists()).toBe(false);
  });

  it("hides columns whose config visible is false", async () => {
    const loadCustomConfigFun = (): Promise<CustomColumnConfigs> =>
      Promise.resolve({ name: cfgOf({ propertyPath: "name", visible: false }) });
    const wrapper = mountTable({ showCustomConfig: true, loadCustomConfigFun });

    await flushPromises();

    const props = wrapper.findAll(".col").map((c) => c.attributes("data-prop"));
    expect(props).toEqual(["id"]);
  });

  it("applies order and width from the loaded config", async () => {
    const loadCustomConfigFun = (): Promise<CustomColumnConfigs> =>
      Promise.resolve({
        // meta 里 displayOrder 是 id(0) < name(1)，配置把 name 提到最前并设宽
        name: cfgOf({ propertyPath: "name", order: 0, width: "120" }),
        id: cfgOf({ propertyPath: "id", order: 1 }),
      });
    const wrapper = mountTable({ showCustomConfig: true, loadCustomConfigFun });

    await flushPromises();

    const cols = wrapper.findAll(".col");
    expect(cols.map((c) => c.attributes("data-prop"))).toEqual(["name", "id"]);
    expect(cols[0]?.attributes("data-width")).toBe("120");
  });

  it("edits columns in the dialog and persists via saveCustomConfigFun", async () => {
    const saveSpy = vi.fn((_config: CustomColumnConfigs) => Promise.resolve());
    // 加载返回 null（尚未保存过）→ 按空配置处理
    const wrapper = mountTable({
      showCustomConfig: true,
      loadCustomConfigFun: () => Promise.resolve(null),
      saveCustomConfigFun: saveSpy,
    });
    await flushPromises();

    // 打开列设置面板
    await wrapper.find(".yk-table__config-btn").trigger("click");
    const dialog = wrapper.find(".el-dialog-stub");
    expect(dialog.exists()).toBe(true);

    // 候选列只含 showForDisplay=true 的列（隐藏列 secret 不出现）
    const labels = dialog.findAll("label.el-checkbox-stub").map((l) => l.text());
    expect(labels).toEqual(["ID", "姓名"]);
    expect(dialog.text()).not.toContain("隐藏列");

    // 取消勾选「姓名」
    const nameLabel = dialog.findAll("label.el-checkbox-stub").find((l) => l.text() === "姓名");
    await nameLabel?.find("input").setValue(false);

    // 保存
    await dialog.find("button.col-config-save").trigger("click");
    await flushPromises();

    // saveCustomConfigFun 收到完整配置：姓名 visible=false，order 为面板行序
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const saved = saveSpy.mock.calls[0]?.[0] as CustomColumnConfigs;
    expect(saved["name"]?.visible).toBe(false);
    expect(saved["id"]?.visible).toBe(true);
    expect(saved["id"]?.order).toBe(0);
    expect(saved["name"]?.order).toBe(1);

    // 保存后立即生效：姓名列消失，面板关闭
    expect(wrapper.findAll(".col").map((c) => c.attributes("data-prop"))).toEqual(["id"]);
    expect(wrapper.find(".el-dialog-stub").exists()).toBe(false);
  });

  it("reorders columns via the move buttons in the dialog", async () => {
    const saveSpy = vi.fn((_config: CustomColumnConfigs) => Promise.resolve());
    const wrapper = mountTable({
      showCustomConfig: true,
      loadCustomConfigFun: () => Promise.resolve(null),
      saveCustomConfigFun: saveSpy,
    });
    await flushPromises();
    await wrapper.find(".yk-table__config-btn").trigger("click");
    const dialog = wrapper.find(".el-dialog-stub");

    // 「姓名」行点「上移」
    const nameRow = dialog
      .findAll(".col-config-row")
      .find((r) => r.text().includes("姓名"));
    const upBtn = nameRow?.findAll("button.act").find((b) => b.text() === "上移");
    await upBtn?.trigger("click");

    await dialog.find("button.col-config-save").trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".col").map((c) => c.attributes("data-prop"))).toEqual(["name", "id"]);
  });
});

describe("Table row actions", () => {
  type Row = { id: number; name: string; secret: string };

  function makeActions() {
    const editExecute = vi.fn((_row: Row) => Promise.resolve());
    const deleteExecute = vi.fn((_row: Row) => Promise.resolve());
    const actions: Action<Row>[] = [
      { name: "edit", desc: "编辑", execute: editExecute },
      {
        name: "delete",
        desc: "删除",
        show: (row) => row.id !== 1, // Alice 行不显示删除
        enable: (row) => row.id !== 2, // Bob 行的删除禁用
        execute: deleteExecute,
      },
    ];
    const rowActionsFunc: RowActionsFunc<Row> = () => Promise.resolve(actions);
    return { editExecute, deleteExecute, rowActionsFunc };
  }

  it("renders an action column with a button per visible action and row", async () => {
    const { rowActionsFunc } = makeActions();
    const wrapper = mountTable({ rowActionsFunc });

    await flushPromises();

    expect(wrapper.text()).toContain("操作");
    const buttons = wrapper.findAll("button.act");
    const texts = buttons.map((b) => b.text());
    // 编辑 * 2 行 + 删除 * 1 行（Alice 被 show 过滤）
    expect(texts).toEqual(["编辑", "编辑", "删除"]);
  });

  it("applies enable() as disabled on the button", async () => {
    const { rowActionsFunc } = makeActions();
    const wrapper = mountTable({ rowActionsFunc });

    await flushPromises();

    const deleteBtn = wrapper.findAll("button.act").find((b) => b.text() === "删除");
    expect(deleteBtn?.attributes("disabled")).toBeDefined();
  });

  it("executes the action with the row on click", async () => {
    const { editExecute, rowActionsFunc } = makeActions();
    const wrapper = mountTable({ rowActionsFunc });

    await flushPromises();

    const firstEdit = wrapper.findAll("button.act").find((b) => b.text() === "编辑");
    await firstEdit?.trigger("click");
    await flushPromises();

    expect(editExecute).toHaveBeenCalledTimes(1);
    expect(editExecute.mock.calls[0]?.[0]).toEqual(rows[0]);
  });
});
