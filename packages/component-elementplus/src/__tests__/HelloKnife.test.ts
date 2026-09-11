import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelloKnife from "../HelloKnife.vue";

describe("HelloKnife", () => {
  it("renders default name", () => {
    const wrapper = mount(HelloKnife, {
      global: {
        // 单元测试里不依赖真实的 element-plus 渲染
        stubs: {
          "el-card": { template: "<div><header>{{ header }}</header><slot /></div>", props: ["header"] },
          "el-button": { template: "<button><slot /></button>" },
          "el-tag": { template: "<span><slot /></span>" },
          "el-space": { template: "<div><slot /></div>" },
        },
      },
    });
    expect(wrapper.text()).toContain("Hello, Knife");
  });

  it("uses provided name", () => {
    const wrapper = mount(HelloKnife, {
      props: { name: "element-plus" },
      global: {
        stubs: {
          "el-card": { template: "<div><header>{{ header }}</header><slot /></div>", props: ["header"] },
          "el-button": { template: "<button><slot /></button>" },
          "el-tag": { template: "<span><slot /></span>" },
          "el-space": { template: "<div><slot /></div>" },
        },
      },
    });
    expect(wrapper.text()).toContain("Hello, element-plus");
  });

  it("increments count on click", async () => {
    const wrapper = mount(HelloKnife, {
      global: {
        stubs: {
          "el-card": { template: "<div><slot /></div>" },
          "el-button": { template: "<button @click=\"$emit('click')\"><slot /></button>" },
          "el-tag": { template: "<span><slot /></span>" },
          "el-space": { template: "<div><slot /></div>" },
        },
      },
    });
    const button = wrapper.find("button");
    await button.trigger("click");
    expect(wrapper.text()).toContain("clicked: 1");
  });
});
