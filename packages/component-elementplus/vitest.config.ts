import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { vue } from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 单测时直接指向源码，避免先构建依赖
      "@ys.knife.crud/core": fileURLToPath(
        new URL("../core/src/index.ts", import.meta.url)
      ),
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "happy-dom",
    globals: false,
  },
});
