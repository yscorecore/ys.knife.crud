import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    vue(),
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
      // Vue 与 element-plus 由消费方安装，避免被打包进库
      external: ["vue", "element-plus", "@ys.knife.crud/core"],
    },
    sourcemap: true,
  },
});
