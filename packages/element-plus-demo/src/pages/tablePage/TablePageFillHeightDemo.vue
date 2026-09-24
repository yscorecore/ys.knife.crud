<script setup lang="ts">
import { ref } from "vue";
import { constData, Operator, type ViewMode } from "@ys.knife.crud/core";
import {
  type TablePageDataFun,
  YsTablePage,
  YsTextFilterItem,
} from "@ys.knife.crud/element-plus";
import { exportRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// 200 行数据：page-size=20 → 10 页，每页 20 行在固定高度内超出产生滚动条
const fillRows: UserRow[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `FillUser${i + 1}`,
  email: `fill${i + 1}@example.com`,
  age: 20 + (i % 40),
  secret: `f${i + 1}`,
}));

/**
 * 解析单条件 FilterInfo.toString()（`name contains "VALUE"`）中的 contains 值，
 * 在前端按姓名片段过滤。真实项目里 dataFun 通常把 filter 透传给后端。
 * 注意：FilterInfo 的右值是 Constant，其 toString 用 JSON.stringify 包裹
 * （字符串值会带双引号），这里用 JSON.parse 反解一次还原原始值。
 */
function extractContains(s: string): string {
  const m = /contains\s+(.+)$/i.exec(s);
  const raw = m?.[1]?.trim() ?? "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
}

const dataFun: TablePageDataFun = (req, filter, signal) => {
  const rows = filter.isEmpty()
    ? fillRows
    : fillRows.filter((r) => r.name.includes(extractContains(filter.toString())));
  return constData(rows)(req, signal);
};

// 视图切换入口由外部 radio 驱动（v-model:view-mode 受控），便于对比三种视图的滚动行为
const viewMode = ref<ViewMode>("table");
</script>

<template>
  <div class="fill-page">
    <header class="fill-page__head">
      <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
      <div class="fill-page__title-row">
        <h1>YsTablePage 占满高度（内容滚动 + 分页固定）</h1>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="table">表格</el-radio-button>
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
        </el-radio-group>
      </div>
      <p class="fill-page__hint">
        整页 <code>100vh</code> 撑满视口，<code>ys-table-page</code> 占满剩余高度：
        顶部查询面板、命令栏固定不滚，表格/卡片/列表内容区超出时出现滚动条，
        底部分页导航始终固定可见。切换三种视图对比滚动行为。200 行数据 / 每页 20 条 = 10 页。
      </p>
    </header>

    <div class="fill-page__body">
      <ys-table-page
        :meta-fun="metaFun"
        :data-fun="dataFun"
        v-model:view-mode="viewMode"
        :page-size="20"
        show-checkbox
        style="height: 100%"
      >
        <!-- filter items → YsFilterPanel 默认插槽 -->
        <ys-text-filter-item
          label="姓名（contains）"
          property-path="name"
          :op="Operator.Contains"
          placeholder="输入姓名片段，如 FillUser1、5"
        />

        <!-- 卡片视图内容 -->
        <template #card="{ row }">
          <div class="user-card">
            <div class="user-card__name">{{ row.name }} <span class="user-card__id">#{{ row.id }}</span></div>
            <div class="user-card__meta">{{ row.email }} · {{ row.age }} 岁</div>
          </div>
        </template>
        <!-- 列表视图内容 -->
        <template #list="{ row }">
          <div class="user-card">
            <span class="user-card__name">{{ row.name }}</span>
            <span class="user-card__meta">{{ row.email }} · {{ row.age }} 岁 · #{{ row.id }}</span>
          </div>
        </template>
      </ys-table-page>
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

/* body 撑满剩余高度；min-height:0 允许 flex 子项收缩，ys-table-page height:100% 才能拿到确定高度 */
.fill-page__body {
  flex: 1;
  min-height: 0;
}

/* 卡片 / 列表视图的简单内容 */
.user-card__name {
  font-weight: 600;
}

.user-card__id {
  margin-left: 4px;
  color: #909399;
  font-weight: 400;
  font-size: 0.85em;
}

.user-card__meta {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
