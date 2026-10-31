import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "dayjs/locale/zh-cn";
import App from "./App";

// 全局中文语言包：分页等组件文案跟随应用 locale
const container = document.getElementById("root");
if (!container) throw new Error("未找到 #root 容器");

createRoot(container).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);
