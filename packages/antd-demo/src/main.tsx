import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/es/locale/zh_CN";
import moment from "moment";
import "moment/locale/zh-cn";
import "antd/dist/antd.css";
import App from "./App";

// antd 4 样式需手动引入；日期组件基于 moment，需同步中文语言包
moment.locale("zh-cn");

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
