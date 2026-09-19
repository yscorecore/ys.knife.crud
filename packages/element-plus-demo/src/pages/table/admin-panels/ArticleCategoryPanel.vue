<!-- 分类管理面板：标签展示 -->
<script setup lang="ts">
const categories = [
  { name: "前端开发", count: 24 },
  { name: "后端服务", count: 18 },
  { name: "数据库", count: 9 },
  { name: "运维部署", count: 7 },
  { name: "算法", count: 12 },
  { name: "产品设计", count: 5 },
];
</script>

<template>
  <div class="panel-cats">
    <el-tag v-for="cat in categories" :key="cat.name" type="info" effect="plain">
      {{ cat.name }}（{{ cat.count }}）
    </el-tag>
  </div>
</template>

<style scoped>
.panel-cats {
  background: var(--el-bg-color, #fff);
  padding: 20px;
  border-radius: 6px;
}

.panel-cats :deep(.el-tag) {
  margin: 0 8px 8px 0;
}
</style>
