import { defineConfig } from "tsup";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Vue 与 element-plus 由消费方安装，避免被打包进库
  external: ["vue", "element-plus", "@ys.knife.crud/core"],
  treeshake: true,
  plugins: [vue()],
});
