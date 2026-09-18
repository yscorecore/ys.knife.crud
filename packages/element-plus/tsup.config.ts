import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Vue 与 element-plus 由消费方安装，避免被打包进库
  external: ["vue", "element-plus", "@ys.knife.crud/core"],
  treeshake: true,
  // NOTE: tsup 基于 esbuild，没有 .vue loader，暂时无法直接构建本包的 SFC。
  // 目前单测（vitest）与 demo（vite alias 指向源码）均不依赖本包构建产物，
  // 构建待迁移到 vite library mode 后落地。
});
