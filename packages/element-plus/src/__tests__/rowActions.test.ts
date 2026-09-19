// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import ElementPlus from "element-plus";
import { constActions, constData, type Meta } from "@ys.knife.crud/core";
import YsTable from "../table.vue";

interface UserRow {
  id: number;
  name: string;
}

const meta: Meta = {
  displayName: "用户",
  description: "用户表",
  columns: [{ propertyPath: "name", displayName: "姓名", showForDisplay: true, displayOrder: 1 }],
};

/** 按组件名查找并断言为 VueWrapper */
function findByName(wrapper: VueWrapper, name: string): VueWrapper {
  return wrapper.findComponent({ name }) as VueWrapper;
}

async function settle(): Promise<void> {
  await flushPromises();
  await nextTick();
  await nextTick();
  await nextTick();
}

function mountTable(editFn: (row: UserRow) => Promise<void>, deleteFn: (row: UserRow) => Promise<void>) {
  const rows: UserRow[] = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
  const rowActionsFunc = constActions<UserRow>(
    { name: "edit", desc: "编辑", execute: editFn },
    // 首行受保护：不显示「删除」
    { name: "delete", desc: "删除", show: (item) => item.id !== 1, execute: deleteFn },
  );
  return mount(YsTable, {
    props: {
      metaFun: async () => meta,
      dataFun: constData(rows),
      pageSize: 10,
      rowKey: "id",
      rowActionsFunc,
      // 内置切换控件默认不渲染（viewSwitchModes=[]），这里显式开启以测试右键菜单用例中的视图切换
      viewSwitchModes: ["table", "card"],
    },
    global: { plugins: [ElementPlus] },
  });
}

function hasActionColumn(wrapper: VueWrapper): boolean {
  return wrapper
    .findAllComponents({ name: "ElTableColumn" })
    .some((col) => (col.vm as unknown as { label?: string }).label === "操作");
}

afterEach(() => {
  document.querySelector(".yk-table__context-menu")?.remove();
  document.querySelector(".yk-table__menu-mask")?.remove();
});

describe("row actions across views", () => {
  it("keeps the action column after a card/table roundtrip", async () => {
    const wrapper = mountTable(
      async () => {},
      async () => {},
    );
    await settle();

    // 初始表格视图存在操作列
    expect(hasActionColumn(wrapper)).toBe(true);

    // 切到卡片再切回（回归点：RowActionsColumn 随 v-if 卸载重建后操作列曾消失）
    await wrapper.setProps({ viewMode: "card" });
    await settle();
    expect(hasActionColumn(wrapper)).toBe(false);
    await wrapper.setProps({ viewMode: "table" });
    await settle();
    expect(hasActionColumn(wrapper)).toBe(true);
    expect(wrapper.text()).toContain("编辑");
    expect(wrapper.text()).toContain("删除");
  });

  it("shows row actions in card view via the right-click context menu", async () => {
    const editFn = vi.fn<(row: UserRow) => Promise<void>>(async () => {});
    const deleteFn = vi.fn<(row: UserRow) => Promise<void>>(async () => {});
    const wrapper = mountTable(editFn, deleteFn);
    await settle();

    // 切到卡片视图
    findByName(wrapper, "ElRadioGroup").vm.$emit("update:modelValue", "card");
    await settle();
    const cards = wrapper.findAll(".yk-table__card");
    expect(cards).toHaveLength(2);

    // 右键首行（id=1）：show 规则下只显示「编辑」
    await cards[0]!.trigger("contextmenu", { clientX: 10, clientY: 10 });
    await nextTick();
    let items = Array.from(document.querySelectorAll(".yk-table__context-menu-item")).map((el) => el.textContent);
    expect(items).toEqual(["编辑"]);

    // 点击「编辑」：execute 收到目标行，菜单关闭
    document.querySelector(".yk-table__context-menu-item")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(editFn).toHaveBeenCalledTimes(1);
    expect(editFn.mock.calls[0]![0]).toMatchObject({ id: 1, name: "Alice" });
    expect(document.querySelector(".yk-table__context-menu")).toBeNull();

    // 右键第二行：「编辑 / 删除」均可见
    await cards[1]!.trigger("contextmenu", { clientX: 10, clientY: 10 });
    await nextTick();
    items = Array.from(document.querySelectorAll(".yk-table__context-menu-item")).map((el) => el.textContent);
    expect(items).toEqual(["编辑", "删除"]);

    // 点遮罩关闭，不执行任何 action
    document.querySelector(".yk-table__menu-mask")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(deleteFn).not.toHaveBeenCalled();
    expect(document.querySelector(".yk-table__context-menu")).toBeNull();
  });
});
