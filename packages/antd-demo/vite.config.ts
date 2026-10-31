import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 开发期直接指向组件库源码，免去先 build 组件库
      "@ys-knife-crud/antd": fileURLToPath(
        new URL("../antd/src/index.ts", import.meta.url)
      ),
      "@ys-knife-crud/react": fileURLToPath(
        new URL("../react/src/index.ts", import.meta.url)
      ),
    },
  },
  server: {
    port: 5180,
    open: true,
  },
});
