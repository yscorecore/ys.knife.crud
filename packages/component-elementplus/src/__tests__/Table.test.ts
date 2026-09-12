import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Table from "../Table.vue";
import {
  constData,
  type Action,
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
// （函数在列渲染时求值，保证数据异步加载后列能拿到最新 rows）
const ElTableStub = {
  name: "ElTable",
  template: '<div class="el-table-stub"><slot /></div>',
  props: ["data", "rowKey"],
  provide(this: { data?: unknown[] }) {
    return { tableRows: (): unknown[] => this.data ?? [] };
  },
};

// el-table-column stub：渲染列头文本，并对每一行调用默认插槽（供操作列使用）
const ElTableColumnStub = {
  name: "ElTableColumn",
  template:
    '<div class="col" :data-prop="prop">{{ label }}' +
    '<template v-for="(r, i) in tableRows()" :key="i"><slot :row="r" /></template></div>',
  props: ["prop", "label"],
  inject: ["tableRows"],
};

// el-button stub：必须声明 emits，否则父组件 @click 会重复触发（事件透传 + 组件事件）
const ElButtonStub = {
  name: "ElButton",
  template: '<button class="act" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  props: ["disabled"],
  emits: ["click"],
};

const stubs = {
  "el-table": ElTableStub,
  "el-table-column": ElTableColumnStub,
  "el-button": ElButtonStub,
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
