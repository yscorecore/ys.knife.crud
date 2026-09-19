<!-- 首页面板：统计卡片 -->
<script setup lang="ts">
const stats = [
  { label: "用户总数", value: "1,286", tone: "#409eff" },
  { label: "今日订单", value: "56", tone: "#67c23a" },
  { label: "待处理消息", value: "3", tone: "#e6a23c" },
  { label: "本月销售额", value: "¥ 91,200", tone: "#f56c6c" },
];
</script>

<template>
  <div class="panel-dash">
    <el-alert type="info" :closable="false" show-icon
      title="欢迎回来，管理员！从左侧功能树打开更多功能。" />
    <div class="panel-dash__cards">
      <el-card v-for="stat in stats" :key="stat.label" shadow="hover">
        <div class="panel-dash__value" :style="{ color: stat.tone }">{{ stat.value }}</div>
        <div class="panel-dash__label">{{ stat.label }}</div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.panel-dash {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-dash__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.panel-dash__value {
  font-size: 26px;
  font-weight: 700;
}

.panel-dash__label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}
</style>
