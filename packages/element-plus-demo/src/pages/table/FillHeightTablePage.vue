<script setup lang="ts">
import { ref } from "vue";
import { listData, type ViewMode } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { exportRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// 200 行数据：page-size=20 → 10 页，每页 20 行在固定高度内超出产生滚动条
const dataFun = listData(() => Promise.resolve(exportRows.slice(0, 200)));

// 视图切换入口由外部 radio 驱动（v-model:view-mode 受控）
const viewMode = ref<ViewMode>("table");
</script>

<template>
  <div class="fill-page">
    <header class="fill-page__head">
      <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
      <div class="fill-page__title-row">
        <h1>占满容器高度（内容滚动 + 分页固定）</h1>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="table">表格</el-radio-button>
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
        </el-radio-group>
      </div>
      <p class="fill-page__hint">
        ys-table 设 <code>height: 100%</code> 占满父容器：表格/卡片/列表内容区超出时出现滚动条，
        底部分页导航始终固定可见不被滚走。开启 <code>sticky-header</code> 后，表格视图滚动时列头锁定在顶部。
        切换三种视图对比滚动行为。200 行数据 / 每页 20 条 = 10 页。
      </p>
    </header>

    <div class="fill-page__body">
      <ys-table :meta-fun="metaFun" :data-fun="dataFun" v-model:view-mode="viewMode"
        :page-size="20" show-checkbox sticky-header style="height: 100%" />
    </div>
  </div>
</template>

<style scoped>
/* 整页撑满视口：flex 纵向，头部固定，body 撑满剩余 */
.fill-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  box-sizing: border-box;
}

.fill-page__head {
  flex-shrink: 0;
}

.fill-page__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0;
}

.fill-page__title-row h1 {
  margin: 0;
  font-size: 18px;
}

.fill-page__hint {
  margin: 0 0 12px;
  color: #666;
  font-size: 0.92em;
  line-height: 1.6;
}

/* body 撑满剩余高度；min-height:0 允许 flex 子项收缩，ys-table height:100% 才能拿到确定高度 */
.fill-page__body {
  flex: 1;
  min-height: 0;
}

code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
