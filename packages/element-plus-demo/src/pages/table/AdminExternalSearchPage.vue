<script setup lang="ts">
/**
 * YsMainPanel 外置功能搜索 demo：
 * show-menu-search=false 关闭侧栏内置搜索框，搜索入口由页面外部自行实现，
 * 经 v-model:menu-keyword 与组件双向绑定——外部输入驱动功能树过滤，
 * 组件内部折叠侧栏等行为不受影响。功能树数据与面板映射复用 adminDemoMenu。
 */
import { ref } from "vue";
import { YsMainPanel } from "@ys.knife.crud/element-plus";
import { loadDemoMenuNodes } from "./adminDemoMenu";

defineEmits<{
  (e: "back"): void;
}>();

const panelModules = import.meta.glob("./admin-panels/*.vue");

/** 外部受控的搜索关键词：v-model 同步给 YsMainPanel */
const keyword = ref("");
</script>

<template>
  <div class="admin-demo">
    <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
    <h1>主面板外置功能搜索（showMenuSearch=false + v-model）</h1>
    <p class="admin-demo__hint">
      侧栏内置搜索框已用 :show-menu-search="false" 关闭，搜索入口放在外部工具栏：
      输入关键词经 v-model:menu-keyword 双向绑定驱动菜单过滤（叶子名称模糊匹配、
      祖先分组自动展开、无结果提示，与内置搜索同一套逻辑）。也可以由外部代码直接写关键词，
      例如点下面的快捷词；点「清空」或输入框 × 复位为完整功能树。
    </p>

    <div class="admin">
      <!-- 外部搜索工具栏：替代内置搜索框的自定义入口 -->
      <div class="admin__toolbar">
        <el-input v-model="keyword" clearable placeholder="外部搜索功能，如：管理 / 文章"
          class="admin__toolbar-search" aria-label="外部功能搜索" />
        <el-button size="small" @click="keyword = '管理'">快捷词：管理</el-button>
        <el-button size="small" @click="keyword = ''">清空</el-button>
        <span class="admin__toolbar-state">当前关键词：{{ keyword || "（空）" }}</span>
      </div>
      <div class="admin__body">
        <ys-main-panel :nodes-func="loadDemoMenuNodes" :component-map="panelModules"
          :show-menu-search="false" v-model:menu-keyword="keyword" />
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

.admin {
  display: flex;
  flex-direction: column;
  height: min(720px, calc(100vh - 320px));
  min-height: 520px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color, #fff);
}

.admin__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  background: var(--el-fill-color-lighter, #f5f7fa);
}

.admin__toolbar-search {
  width: 260px;
}

.admin__toolbar-state {
  margin-left: auto;
  color: var(--el-text-color-secondary, #909399);
  font-size: 0.88em;
}

.admin__body {
  flex: 1;
  min-height: 0;
}
</style>
