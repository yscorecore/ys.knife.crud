import { createApp } from "vue";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";
import YsCrudElementPlus from "@ys-knife-crud/element-plus";
import App from "./App.vue";

const app = createApp(App);
// 全局中文语言包：分页等组件文案跟随应用 locale
app.use(ElementPlus, { locale: zhCn });
// 安装库插件：全局注册 Ys 组件，同时让 openModal 动态挂载的弹窗继承本应用的
// AppContext（否则 openModal 内部模板无法解析 el-* 等全局组件）
app.use(YsCrudElementPlus);
app.mount("#app");
