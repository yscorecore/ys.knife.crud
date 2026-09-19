<!-- 操作日志面板：时间线 -->
<script setup lang="ts">
const logs = [
  { content: "管理员 修改了参数设置「会话超时时间」", timestamp: "2026-09-19 10:12" },
  { content: "admin 新增用户「张三」", timestamp: "2026-09-18 16:40" },
  { content: "管理员 导出了用户数据（25 行）", timestamp: "2026-09-18 14:05" },
  { content: "系统 自动清理了 30 天前的操作日志", timestamp: "2026-09-17 00:00" },
];
</script>

<template>
  <el-timeline class="panel-logs">
    <el-timeline-item v-for="(log, i) in logs" :key="i" :timestamp="log.timestamp">
      {{ log.content }}
    </el-timeline-item>
  </el-timeline>
</template>

<style scoped>
.panel-logs {
  background: var(--el-bg-color, #fff);
  padding: 20px;
  border-radius: 6px;
}
</style>
