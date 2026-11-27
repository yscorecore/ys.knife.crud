import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { libInjectCss } from "vite-plugin-lib-inject-css";

export default defineConfig({
  plugins: [
    react(),
    // 把组件样式以 import 形式注入产物入口，消费方 import 组件即自动带样式
    libInjectCss(),
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/*.test.tsx"],
    }),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      // React、antd 及工作区/运行时依赖由消费方安装，避免被打包进库
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "antd",
        "dayjs",
        "@ys-knife-crud/core",
        "@ys-knife-crud/react",
        // 查询表达式库必须外部化：一旦被打进产物，就会与 core 内部那份形成两个
        // Constant/FilterInfo 类实例，instanceof 判定失败后 toString 直接抛异常。
        "ys.knife.query.js",
      ],
    },
    sourcemap: true,
  },
});
