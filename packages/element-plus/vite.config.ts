import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";

export default defineConfig({
  plugins: [
    vue(),
    // 把 SFC 编译产出的 style.css 以 import 形式注入产物入口，
    // 消费方 import 组件即自动带样式，无需手动引 CSS
    libInjectCss(),
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: ["src/**/__tests__/**", "src/**/*.test.ts"],
    }),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      // Vue、element-plus 及工作区/运行时依赖由消费方安装，避免被打包进库
      external: [
        "vue",
        "element-plus",
        "dayjs",
        "@ys-knife-crud/core",
        "@ys-knife-crud/vue",
      ],
    },
    sourcemap: true,
  },
});
