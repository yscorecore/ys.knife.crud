<script setup lang="ts">
import { listData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// 模拟 2 秒慢接口：listData 包装后，每次 dataFun 调用（首载、翻页、改每页条数、reload）
// 都会重新调用 listFunc，等待 2s 后再分页切片返回，让 loading 遮罩停留足够久便于观察
const dataFun = listData<UserRow>(
  () =>
    new Promise<UserRow[]>((resolve) =>
      setTimeout(() => resolve(manyRows), 2000),
    ),
);
</script>

<template>
  <DemoPageLayout
    title="加载中效果（三视图 loading 遮罩 + #loading 插槽）"
    hint="dataFun 模拟 2 秒慢接口（listData 包装），首载与每次翻页都会触发 loading。上方表格未提供 #loading 插槽：三视图显示内置 spinner 遮罩——表格视图遮罩盖住表格体，卡片 / 列表视图盖住整个视图区域（翻页时旧数据仍在遮罩下，首载无数据时容器有 min-height 保底）。下方表格提供了 #loading 插槽：三种视图的遮罩中央都渲染自定义内容，可用右上角切换控件逐个对比。"
    @back="$emit('back')"
  >
    <h4 class="loading-demo__caption">默认 loading（内置 spinner）</h4>
    <ys-table
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
      :view-switch-modes="['table', 'card', 'list']"
    />

    <h4 class="loading-demo__caption">自定义 loading（#loading 插槽，三种视图共用）</h4>
    <ys-table
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
      :view-switch-modes="['table', 'card', 'list']"
    >
      <template #loading>
        <div class="loading-demo__custom">
          <span class="loading-demo__pulse" />
          <span>数据加载中，请稍候…</span>
        </div>
      </template>
    </ys-table>
  </DemoPageLayout>
</template>

<style scoped>
.loading-demo__caption {
  margin: 4px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary, #909399);
}

.loading-demo__caption + * {
  margin-bottom: 24px;
}

/* 自定义 loading 内容：脉冲圆点 + 文案 */
.loading-demo__custom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--el-color-primary, #409eff);
}

.loading-demo__pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--el-color-primary, #409eff);
  animation: loading-demo-pulse 1s ease-in-out infinite alternate;
}

@keyframes loading-demo-pulse {
  from {
    transform: scale(0.6);
    opacity: 0.4;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
