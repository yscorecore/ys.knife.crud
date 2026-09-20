<script setup lang="ts">
/**
 * YsMainPanel 测试页：仅聚焦左侧功能树 + 右侧主面板选项卡。
 * 功能树数据（FunctionNode 树，经 nodesFunc 异步返回）由共享的 adminDemoMenu 提供，
 * 叶子节点的 component 约定为组件路径字符串（相对于本文件，如
 * "./admin-panels/DashboardPanel.vue"）；经 import.meta.glob 收集同目录下的面板组件
 * 生成 componentMap 传给 YsMainPanel，由组件内部动态加载并显示在主面板选项卡中
 * （可关闭、去重激活）。
 */
import { YsMainPanel } from "@ys.knife.crud/element-plus";
import { loadDemoMenuNodes } from "./adminDemoMenu";

defineEmits<{
  (e: "back"): void;
}>();

// 面板组件注册表：import.meta.glob 收集 admin-panels 下全部 .vue。
// key 为相对本文件的路径（与 FunctionNode.component 取值一致），value 为异步加载器
const panelModules = import.meta.glob("./admin-panels/*.vue");
</script>

<template>
  <div class="admin-demo">
    <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
    <h1>管理系统布局（功能树 + 主面板选项卡）</h1>
    <p class="admin-demo__hint">
      本页用于测试 YsMainPanel：功能树数据（FunctionNode 树）经 nodes-func 异步加载，
      叶子节点的 component 约定为组件路径字符串（如 "./admin-panels/DashboardPanel.vue"）、
      props 声明透传给面板组件的参数（如参数设置面板的标题与提示开关），点击后由 YsMainPanel
      内部动态 import 加载对应面板组件并显示在主面板选项卡中（已打开则直接激活、可关闭；
      侧栏内置 ☰ 折叠按钮，折叠后仅显示图标、分组悬浮弹出）。
      侧栏顶部内置功能搜索框：对叶子名称做大小写不敏感的模糊匹配（多个词以空格分隔需同时命中），
      命中项的祖先分组自动展开，无结果显示提示；折叠侧栏时搜索框隐藏。
      面板中的 YsTable 支持拖动表头列边界调整列宽（经 localStorage 持久化）与勾选。
    </p>

    <div class="admin">
      <!-- YsMainPanel（功能树 + 主面板选项卡） -->
      <div class="admin__body">
        <ys-main-panel :nodes-func="loadDemoMenuNodes" :component-map="panelModules"
          default-active="dashboard" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-demo__hint {
  color: #666;
  font-size: 0.92em;
  line-height: 1.6;
  margin: 8px 0 16px;
}

h1 {
  margin: 16px 0 8px;
}

/* ---------------- YsMainPanel 容器 ---------------- */
.admin {
  display: flex;
  flex-direction: column;
  height: min(720px, calc(100vh - 260px));
  min-height: 520px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color, #fff);
}

.admin__body {
  flex: 1;
  min-height: 0;
}
</style>
