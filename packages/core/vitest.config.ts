import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // 单测时直接引用 workspace 内的源码，无需先构建 @ys.knife.crud/utils
      "@ys.knife.crud/utils": fileURLToPath(
        new URL("../utils/src/index.ts", import.meta.url)
      ),
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
