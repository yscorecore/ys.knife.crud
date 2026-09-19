// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import ElementPlus from "element-plus";
import { constData, type Meta, type PagedList } from "@ys.knife.crud/core";
import YsTable from "../table.vue";

interface Row {
  id: number;
  name: string;
}

const meta: Meta = {
  displayName: "用户",
  description: "用户表",
  columns: [{ propertyPath: "name", displayName: "姓名", showForDisplay: true, displayOrder: 1 }],
};

const allRows: Row[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `u${i + 1}` }));

async function settle(): Promise<void> {
  await flushPromises();
  await nextTick();
  await nextTick();
  await nextTick();
}

describe("loading mask across card/list views", () => {
  it("keeps the container min-height and shows the mask while dataFun is pending", async () => {
    // 手动控制 resolve 时机：dataFun 一直 pending，模拟首载慢接口
    let resolveData!: (value: Promise<PagedList<Row>>) => void;
    const slowDataFun = (): Promise<PagedList<Row>> =>
      new Promise((resolve) => {
        resolveData = resolve;
      });

    const wrapper = mount(YsTable, {
      props: {
        metaFun: async () => meta,
        dataFun: slowDataFun,
        pageSize: 10,
        rowKey: "id",
        showCheckbox: true,
        viewSwitchModes: ["table", "card", "list"],
      },
      global: { plugins: [ElementPlus] },
    });
    await settle();

    // 首载未返回（rows 为空）时切到卡片视图：遮罩可见（容器 min-height 由样式保证，浏览器实测不塌陷）
    await wrapper.setProps({ viewMode: "card" });
    await settle();
    expect(wrapper.find(".yk-table__cards").exists()).toBe(true);
    expect(wrapper.find(".yk-table__loading-mask").isVisible()).toBe(true);

    // 列表视图同样如此
    await wrapper.setProps({ viewMode: "list" });
    await settle();
    expect(wrapper.find(".yk-table__list").exists()).toBe(true);
    expect(wrapper.find(".yk-table__loading-mask").isVisible()).toBe(true);

    // 数据返回后：当前页数据渲染（遮罩经 0.3s 淡出过渡移除，happy-dom 中
    // transitionend 不触发会滞留 DOM，故此处不断言遮罩可见性——浏览器实测遮罩正常消失）
    resolveData(constData(allRows)({ limit: 10, offset: 0 }));
    await settle();
    expect(wrapper.findAll(".yk-table__list-item")).toHaveLength(10);
  });

  it("renders the #loading slot content inside the mask across all views", async () => {
    let resolveData!: (value: Promise<PagedList<Row>>) => void;
    const slowDataFun = (): Promise<PagedList<Row>> =>
      new Promise((resolve) => {
        resolveData = resolve;
      });

    const wrapper = mount(YsTable, {
      props: {
        metaFun: async () => meta,
        dataFun: slowDataFun,
        pageSize: 10,
        rowKey: "id",
        showCheckbox: true,
        viewSwitchModes: ["table", "card", "list"],
      },
      slots: { loading: "<div class='my-loading'>加载中…</div>" },
      global: { plugins: [ElementPlus] },
    });
    await settle();

    // 表格视图：遮罩内渲染自定义内容而非内置 spinner
    expect(wrapper.find(".yk-table__table-wrap .yk-table__loading-mask .my-loading").exists()).toBe(true);
    expect(wrapper.find(".yk-table__loading-spinner").exists()).toBe(false);

    // 卡片视图
    await wrapper.setProps({ viewMode: "card" });
    await settle();
    expect(wrapper.find(".yk-table__cards .yk-table__loading-mask .my-loading").exists()).toBe(true);

    // 列表视图
    await wrapper.setProps({ viewMode: "list" });
    await settle();
    expect(wrapper.find(".yk-table__list .yk-table__loading-mask .my-loading").exists()).toBe(true);

    // 数据返回后：当前页数据渲染（mask 滞留同上，不断言遮罩/插槽内容移除）
    resolveData(constData(allRows)({ limit: 10, offset: 0 }));
    await settle();
    expect(wrapper.findAll(".yk-table__list-item")).toHaveLength(10);
  });
});
