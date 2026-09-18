import { createApp } from "vue";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";
import App from "./App.vue";

const app = createApp(App);
// 全局中文语言包：分页等组件文案跟随应用 locale
app.use(ElementPlus, { locale: zhCn });
app.mount("#app");
