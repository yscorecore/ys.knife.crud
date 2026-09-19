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

function mountTable(overrides: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(YsTable, {
    props: {
      metaFun: async () => meta,
      dataFun,
      pageSize: 10,
      rowKey: "id",
      showCheckbox: true,
      viewSwitchModes: ["table", "card", "list"],
      ...overrides,
    },
    slots,
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

  it("hides the built-in view switch by default (empty viewSwitchModes)", async () => {
    // 默认 viewSwitchModes=[]：不渲染内置切换控件，但工具栏（选中提示所在行）照常渲染
    const wrapper = mountTable({ viewSwitchModes: [] });
    await settle();

    expect(findByName(wrapper, "ElRadioGroup").exists()).toBe(false);
    expect(wrapper.find(".yk-table__toolbar").exists()).toBe(true);
    expect(findByName(wrapper, "ElTable").exists()).toBe(true);
  });

  it("switches view via the built-in radio without a bound v-model (uncontrolled)", async () => {
    const wrapper = mountTable();
    await settle();

    // 默认表格视图：ElTable 存在
    expect(findByName(wrapper, "ElTable").exists()).toBe(true);
    expect(wrapper.find(".yk-table__cards").exists()).toBe(false);

    // 未绑定 v-model:view-mode：模拟内置 radio-group 选择「卡片」
    const switcher = findByName(wrapper, "ElRadioGroup");
    switcher.vm.$emit("update:modelValue", "card");
    await settle();

    // 组件内部状态自行切换（不依赖父级回写 prop）
    expect(findByName(wrapper, "ElTable").exists()).toBe(false);
    expect(wrapper.find(".yk-table__cards").exists()).toBe(true);
    // 同时向外派发了 update:viewMode
    expect(wrapper.emitted("update:viewMode")?.[0]).toEqual(["card"]);

    // 切回表格
    switcher.vm.$emit("update:modelValue", "table");
    await settle();
    expect(findByName(wrapper, "ElTable").exists()).toBe(true);
    expect(wrapper.find(".yk-table__cards").exists()).toBe(false);
  });

  it("renders list view with one full-width item per row and selectable checkboxes", async () => {
    const wrapper = mountTable();
    await settle();

    // 切到列表视图
    await wrapper.setProps({ viewMode: "list" });
    await settle();

    // el-table 不渲染，列表项数量 = 当前页行数（10 行）
    expect(findByName(wrapper, "ElTable").exists()).toBe(false);
    expect(wrapper.findAll(".yk-table__list-item")).toHaveLength(10);

    // 勾选第一行的 checkbox（直接 emit 组件 change 事件，作用域回调写入跨页选中集合）
    await findByName(wrapper, "ElCheckbox").vm.$emit("change", true);
    await settle();
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(1);

    // 翻页后选中保留
    const pager = findByName(wrapper, "ElPagination");
    pager.vm.$emit("current-change", 2);
    await settle();
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(1);

    // 切回表格视图：el-table 重新挂载且累计选中不变
    await wrapper.setProps({ viewMode: "table" });
    await settle();
    expect(findByName(wrapper, "ElTable").exists()).toBe(true);
    expect((wrapper.vm as unknown as { selectedRows: unknown[] }).selectedRows).toHaveLength(1);
  });

  it("shares the #empty slot across table/card/list views and falls back to el-empty", async () => {
    // 空数据 + 自定义 #empty 插槽
    const wrapper = mountTable({ dataFun: constData([]) }, { empty: "<div class='my-empty'>自定义空态</div>" });
    await settle();

    // 表格视图：插槽内容生效
    expect(wrapper.find(".my-empty").exists()).toBe(true);

    // 卡片视图：插槽内容生效，默认 el-empty 不渲染
    await wrapper.setProps({ viewMode: "card" });
    await settle();
    expect(wrapper.find(".yk-table__cards").exists()).toBe(true);
    expect(wrapper.find(".my-empty").exists()).toBe(true);
    expect(wrapper.find(".yk-table__cards .el-empty").exists()).toBe(false);

    // 列表视图：插槽内容生效
    await wrapper.setProps({ viewMode: "list" });
    await settle();
    expect(wrapper.find(".yk-table__list").exists()).toBe(true);
    expect(wrapper.find(".my-empty").exists()).toBe(true);
    expect(wrapper.find(".yk-table__list .el-empty").exists()).toBe(false);
  });

  it("falls back to the default el-empty in card/list views without a #empty slot", async () => {
    // 空数据 + 未提供 #empty：三种视图都回落 el-empty「暂无数据」
    const wrapper = mountTable({ dataFun: constData([]) });
    await settle();

    await wrapper.setProps({ viewMode: "card" });
    await settle();
    expect(wrapper.find(".yk-table__cards .el-empty").exists()).toBe(true);

    await wrapper.setProps({ viewMode: "list" });
    await settle();
    expect(wrapper.find(".yk-table__list .el-empty").exists()).toBe(true);
  });
});
