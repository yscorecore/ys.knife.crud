import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Table from "../Table.vue";
import { constData, type Meta, type MetaFunc, type PageFunc } from "@ys.knife.crud/core";

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

const ElTableStub = {
  name: "ElTable",
  template: '<div class="el-table-stub"><slot /></div>',
  props: ["data", "rowKey"],
};

const stubs = {
  "el-table": ElTableStub,
  "el-table-column": {
    template: '<div class="col" :data-prop="prop">{{ label }}</div>',
    props: ["prop", "label"],
  },
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

    const tableStub = wrapper.findComponent({ name: "el-table" });
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
});
