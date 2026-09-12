import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 开发期直接指向组件库源码，免去先 build 组件库（tsup 对 .vue 支持有限）
      "@ys.knife.crud/component-elementplus": fileURLToPath(
        new URL("../component-elementplus/src/index.ts", import.meta.url)
      ),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
