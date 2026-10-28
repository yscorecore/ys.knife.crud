import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";

/**
 * 小程序内置标签：SFC 模板按「原生元素」编译为字符串标签 vnode
 * （Taro 运行时的 document.createElement 按标签名创建小程序元素），
 * 而不是走 resolveComponent 组件解析——这样库产物可被任意 Taro 应用直接消费。
 */
const MINI_TAGS = new Set([
  "view",
  "text",
  "scroll-view",
  "image",
  "block",
  "button",
  "input",
  "label",
  "checkbox",
  "checkbox-group",
  "picker",
  "navigator",
  "cover-view",
  "cover-image",
  "rich-text",
  "progress",
  "icon",
  "form",
  "textarea",
  "map",
  "canvas",
  "video",
  "camera",
  "swiper",
  "swiper-item",
  "slot",
]);

export default defineConfig({
  plugins: [
    vue({
      compilerOptions: {
        isCustomElement: (tag) => tag.includes("-") || MINI_TAGS.has(tag),
      },
    }),
    // 把 SFC 编译产出的 style.css 以 import 形式注入产物入口，
    // 消费方（Taro 应用）import 组件即自动带样式
    libInjectCss(),
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts", "src/**/*.vue"],
    }),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      // vue、@tarojs/taro 及工作区依赖由消费方（Taro 应用）安装，避免被打包进库
      external: ["vue", "@tarojs/taro", "@ys-knife-crud/core"],
    },
    sourcemap: true,
  },
});
