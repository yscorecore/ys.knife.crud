// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import ElementPlus from "element-plus";
import { constData, type Meta } from "@ys.knife.crud/core";
import YsTable from "../table.vue";

const meta: Meta = {
  displayName: "用户",
  description: "用户表",
  columns: [
    { propertyPath: "id", displayName: "ID", showForDisplay: true, displayOrder: 1 },
    { propertyPath: "name", displayName: "姓名", showForDisplay: true, displayOrder: 2 },
  ],
};

/** 按组件名查找并断言为 VueWrapper（el 组件的静态引用在泛型推断下会退化为 DOMWrapper） */
function findByName(wrapper: VueWrapper, name: string): VueWrapper {
  return wrapper.findComponent({ name }) as VueWrapper;
}

const allRows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `u${i + 1}` }));
const dataFun = constData(allRows);

async function settle(): Promise<void> {
  await flushPromises();
  await nextTick();
  await nextTick();
  await nextTick();
}

function mountTable() {
  return mount(YsTable, {
    props: {
      metaFun: async () => meta,
      dataFun,
      pageSize: 10,
      rowKey: "id",
      showCheckbox: true,
    },
    global: { plugins: [ElementPlus] },
  });
}

describe("cross-page selection (controlled rowKey map)", () => {
  it("keeps selection when paging back and forth in table view", async () => {
    const wrapper = mountTable();
    await settle();

    const table = findByName(wrapper, "ElTable");
    const pager = findByName(wrapper, "ElPagination");
    const toggle = (row: unknown, selected: boolean) =>
      (table.vm as unknown as { toggleRowSelection: (r: unknown, s?: boolean) => void }).toggleRowSelection(row, selected);

    // 第 1 页勾 2 行
    toggle(allRows[0]!, true);
    toggle(allRows[1]!, true);
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(2);

    // 翻到第 2 页：第 1 页选中保留
    pager.vm.$emit("current-change", 2);
    await settle();
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(2);

    // 第 2 页再勾 1 行
    toggle(allRows[10]!, true);
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(3);

    // 翻回第 1 页：3 项全部保留（回归点：曾在此变成 1~2 项）
    pager.vm.$emit("current-change", 1);
    await settle();
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(3);
  });

  it("keeps selection across card/table view switches", async () => {
    const wrapper = mountTable();
    await settle();

    const table = findByName(wrapper, "ElTable");
    const pager = findByName(wrapper, "ElPagination");
    const toggle = (row: unknown, selected: boolean) =>
      (table.vm as unknown as { toggleRowSelection: (r: unknown, s?: boolean) => void }).toggleRowSelection(row, selected);

    toggle(allRows[0]!, true);
    toggle(allRows[1]!, true);
    pager.vm.$emit("current-change", 2);
    await settle();
    toggle(allRows[10]!, true);
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(3);

    // 第 2 页切到卡片视图
    await wrapper.setProps({ viewMode: "card" });
    await settle();
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(3);

    // 切回表格视图（el-table 重新挂载）
    await wrapper.setProps({ viewMode: "table" });
    await settle();
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(3);

    // 翻回第 1 页仍为 3 项
    pager.vm.$emit("current-change", 1);
    await settle();
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(3);
  });
});
