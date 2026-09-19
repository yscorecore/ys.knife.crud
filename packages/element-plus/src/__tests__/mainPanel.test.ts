// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick, defineComponent, markRaw } from "vue";
import ElementPlus from "element-plus";
import type { FunctionNode } from "@ys.knife.crud/core";
import YsMainPanel from "../mainPanel.vue";

function settle(): Promise<void> {
  return flushPromises().then(() => nextTick());
}

const nodes: FunctionNode[] = [
  { key: "a", label: "功能A", icon: "🅰", component: "panelA" },
  {
    key: "g",
    label: "分组",
    icon: "📦",
    children: [{ key: "b", label: "功能B", component: "panelB" }],
  },
];

/** 同步解析：按名称渲染可断言的内容；支持接收节点级透传的 tag props */
const syncResolve = (name: string) =>
  markRaw(defineComponent({
    props: { tag: { type: String, default: "" } },
    template: `<div class="panel">{{ tag || '${name}' }}</div>`,
  }));

/** 带分组的树：分组里还嵌一层分组，覆盖递归渲染 */
const deepNodes: FunctionNode[] = [
  {
    key: "l1",
    label: "一级",
    icon: "1️⃣",
    children: [
      {
        key: "l2",
        label: "二级",
        children: [{ key: "leaf", label: "叶子", component: "deepPanel" }],
      },
    ],
  },
];

async function mountPanel(overrides: Record<string, unknown> = {}) {
  const wrapper = mount(YsMainPanel, {
    props: {
      nodesFunc: async () => nodes,
      resolveComponent: syncResolve,
      ...overrides,
    },
    global: { plugins: [ElementPlus] },
  });
  await settle();
  return wrapper;
}

describe("YsMainPanel", () => {
  it("renders no tab and shows empty state by default", async () => {
    const wrapper = await mountPanel();
    expect(wrapper.find(".el-tabs").exists()).toBe(false);
    expect(wrapper.find(".el-empty").exists()).toBe(true);
  });

  it("loads the tree via nodesFunc and applies defaultActive only after resolve", async () => {
    let resolveNodes!: (value: FunctionNode[]) => void;
    const wrapper = mount(YsMainPanel, {
      props: {
        nodesFunc: () =>
          new Promise<FunctionNode[]>((resolve) => {
            resolveNodes = resolve;
          }),
        resolveComponent: syncResolve,
        defaultActive: "a",
      },
      global: { plugins: [ElementPlus] },
    });
    await nextTick();

    // nodesFunc pending：菜单尚无节点，选项卡未打开
    expect(wrapper.findAll(".el-menu-item")).toHaveLength(0);
    expect(wrapper.find(".el-tabs").exists()).toBe(false);

    resolveNodes(nodes);
    await settle();

    // 加载完成：叶子渲染，defaultActive 生效
    // （el-menu-item 不渲染 index DOM attribute，且文本含 icon 前缀，故拼接后按子串断言）
    expect(wrapper.findAll(".el-menu-item").map((item) => item.text()).join()).toContain("功能A");
    expect(wrapper.findAll(".el-tabs__item")).toHaveLength(1);
    expect(wrapper.find(".el-tab-pane .panel").text()).toBe("panelA");
  });

  it("opens the defaultActive leaf on mount and renders its component", async () => {
    const wrapper = await mountPanel({ defaultActive: "a" });
    const tabs = wrapper.findAll(".el-tabs__item");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.text()).toContain("功能A");
    // 选项卡内容渲染 resolveComponent("panelA") 的结果
    expect(wrapper.find(".el-tab-pane .panel").text()).toBe("panelA");
  });

  it("opens a nested leaf on menu select without duplicating tabs", async () => {
    const wrapper = await mountPanel({ nodesFunc: async () => deepNodes });
    // 递归节点：两级分组 + 一个叶子
    const menuNodes = wrapper.findAllComponents({ name: "YsMainPanelMenuNode" });
    expect(menuNodes).toHaveLength(3);

    // 子菜单收起时叶子 DOM 未渲染，直接经 ElMenu 的 select 事件模拟叶子点击
    await wrapper.findComponent({ name: "ElMenu" }).vm.$emit("select", "leaf");
    await settle();

    const tabs = wrapper.findAll(".el-tabs__item");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.text()).toContain("叶子");
    expect(wrapper.find(".el-tab-pane .panel").text()).toBe("deepPanel");

    // 重复点击同一叶子：不重复创建选项卡
    await wrapper.findComponent({ name: "ElMenu" }).vm.$emit("select", "leaf");
    await settle();
    expect(wrapper.findAll(".el-tabs__item")).toHaveLength(1);
  });

  it("activates the neighbor tab when the active tab is closed", async () => {
    const wrapper = await mountPanel({ defaultActive: "a" });
    // 打开第二个选项卡（叶子 b 在分组下）
    await wrapper.findComponent({ name: "ElMenu" }).vm.$emit("select", "b");
    await settle();
    expect(wrapper.findAll(".el-tabs__item")).toHaveLength(2);
    expect(wrapper.findAll(".el-tabs__item").map((t) => t.classes()))
      .toContainEqual(expect.arrayContaining(["is-active"]));

    // 关闭当前激活的 b：激活相邻的 a
    await wrapper.findComponent({ name: "ElTabs" }).vm.$emit("tab-remove", "b");
    await settle();
    const items = wrapper.findAll(".el-tabs__item");
    expect(items).toHaveLength(1);
    expect(items[0]?.text()).toContain("功能A");
    expect(items[0]?.classes()).toContain("is-active");

    // 关闭最后一个选项卡：回到空态
    await wrapper.findComponent({ name: "ElTabs" }).vm.$emit("tab-remove", "a");
    await settle();
    expect(wrapper.find(".el-tabs").exists()).toBe(false);
    expect(wrapper.find(".el-empty").exists()).toBe(true);
  });

  it("resolves components asynchronously via Promise", async () => {
    let resolvePanel!: (value: ReturnType<typeof syncResolve>) => void;
    const wrapper = await mountPanel({
      defaultActive: "a",
      // 返回 Promise<Component>：组件经 defineAsyncComponent 异步加载
      resolveComponent: (name: string) =>
        new Promise<ReturnType<typeof syncResolve>>((resolve) => {
          resolvePanel = resolve;
          expect(name).toBe("panelA");
        }),
    });

    // Promise 未完成：选项卡已打开，内容暂未渲染
    expect(wrapper.findAll(".el-tabs__item")).toHaveLength(1);
    expect(wrapper.find(".el-tab-pane .panel").exists()).toBe(false);

    // resolve 后异步组件渲染
    resolvePanel(syncResolve("panelA"));
    await settle();
    expect(wrapper.find(".el-tab-pane .panel").text()).toBe("panelA");
  });

  it("passes node-level props to the panel component via v-bind", async () => {
    const propsNodes: FunctionNode[] = [
      { key: "p", label: "带参数", component: "panelA", props: { tag: "实例参数" } },
      { key: "q", label: "无参数", component: "panelA" },
    ];
    const wrapper = await mountPanel({ nodesFunc: async () => propsNodes });

    await wrapper.findComponent({ name: "ElMenu" }).vm.$emit("select", "p");
    await settle();
    expect(wrapper.find(".el-tab-pane .panel").text()).toBe("实例参数");

    // 同一组件类型、未声明 props 的节点：渲染默认内容（组件名）
    await wrapper.findComponent({ name: "ElMenu" }).vm.$emit("select", "q");
    await settle();
    const panes = wrapper.findAll(".el-tab-pane .panel");
    expect(panes).toHaveLength(2);
    expect(panes[0]?.text()).toBe("实例参数");
    expect(panes[1]?.text()).toBe("panelA");
  });

  it("toggles the menu collapse state", async () => {
    const wrapper = await mountPanel();
    const aside = wrapper.find(".ys-main-panel__aside");
    expect(aside.classes()).not.toContain("is-collapsed");

    await wrapper.find(".ys-main-panel__collapse-btn").trigger("click");
    expect(aside.classes()).toContain("is-collapsed");

    await wrapper.find(".ys-main-panel__collapse-btn").trigger("click");
    expect(aside.classes()).not.toContain("is-collapsed");
  });
});
