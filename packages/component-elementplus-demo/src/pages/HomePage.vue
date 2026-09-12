<script setup lang="ts">
// 导航页：四个入口，分别对应 Table 组件的四种数据源演示模式
type DemoPage = "table-empty" | "table-const" | "table-actions" | "table-list";

defineEmits<{
  (e: "navigate", page: DemoPage): void;
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
        <el-button type="primary" size="large" @click="$emit('navigate', 'table-empty')">
          空数据表格（emptyData）
        </el-button>
        <el-button type="primary" size="large" @click="$emit('navigate', 'table-const')">
          固定数据表格（constData）
        </el-button>
        <el-button type="primary" size="large" @click="$emit('navigate', 'table-actions')">
          带行操作的表格（constData + constActions）
        </el-button>
        <el-button type="primary" size="large" @click="$emit('navigate', 'table-list')">
          异步列表表格（listData）
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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.nav-list .el-button + .el-button {
  margin-left: 0;
}
code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
