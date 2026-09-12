<script setup lang="ts">
// 导航页：目前只有一个入口，点击按钮切换到 Table Demo 页面
defineEmits<{
  (e: "navigate", page: "table"): void;
}>();
</script>

<template>
  <main class="home">
    <h1>component-elementplus-demo</h1>
    <p class="lead">
      用于验证 <code>@ys.knife.crud/component-elementplus</code> 组件库的本地演示项目。
      此包标记为 <code>private</code>，不会发布到 npm。
    </p>

    <section class="nav">
      <h2>Demo 导航</h2>
      <p class="hint">选择一个 Demo 进入对应的演示页面。</p>

      <div class="nav-list">
        <el-button type="primary" size="large" @click="$emit('navigate', 'table')">
          查看 Table Demo
        </el-button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  max-width: 860px;
  margin: 48px auto;
  padding: 24px;
}
.lead {
  color: #666;
  line-height: 1.7;
}
.nav {
  margin-top: 32px;
}
.nav h2 {
  margin: 0 0 8px;
}
.hint {
  color: #666;
  font-size: 0.92em;
}
.nav-list {
  margin-top: 16px;
}
code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
