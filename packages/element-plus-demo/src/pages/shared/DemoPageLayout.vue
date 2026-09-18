<script setup lang="ts">
/**
 * 演示页面通用布局：返回导航按钮 + 标题 + 说明 + 可选工具栏 + 页面主体。
 * 各演示页只关心自己的数据与表格配置，统一的页面骨架收敛在这里（单一来源）。
 */
defineProps<{
  title: string;
  hint: string;
}>();

defineEmits<{
  (e: "back"): void;
}>();
</script>

<template>
  <main class="demo-page">
    <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>

    <h1>{{ title }}</h1>
    <p class="hint">
      {{ hint }}
      <code>secret</code> 列因 <code>showForDisplay: false</code> 被隐藏。
    </p>

    <div v-if="$slots.toolbar" class="toolbar">
      <slot name="toolbar" />
    </div>

    <slot />
  </main>
</template>

<style scoped>
.demo-page {
  max-width: 860px;
  margin: 32px auto;
  padding: 24px;
}
h1 {
  margin: 16px 0 8px;
}
.hint {
  color: #666;
  font-size: 0.92em;
  line-height: 1.6;
  margin-bottom: 16px;
}
.toolbar {
  margin-bottom: 12px;
}
code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
