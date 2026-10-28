<script setup lang="ts">
import { ref } from "vue";
import { YsInfiniteList } from "@ys-knife-crud/taro";
import type { PageFunc } from "@ys-knife-crud/core";

/**
 * YsInfiniteList（小程序版）演示页：
 * 100 行 mock 数据、每页 10 条 → 可连续加载 10 页。
 * showCheckbox 演示行选中（跨页累计），工具栏经 ref 调
 * reload / loadNextPage / 全选已加载 / 反选 / 清空。
 * dataFun 契约与 YsTable / web 版 YsInfiniteList 完全一致。
 */
interface MockRow {
  id: number;
  name: string;
  email: string;
  age: number;
}

const ROWS: MockRow[] = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `User${i + 1}`,
  email: `user${i + 1}@example.com`,
  age: 18 + (i % 40),
}));

const dataFun: PageFunc<MockRow> = async (req) => {
  const limit = req.limit ?? 10;
  const offset = req.offset ?? 0;
  // 模拟网络延迟，便于观察加载态
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    limit,
    offset,
    totalCount: ROWS.length,
    hasNext: offset + limit < ROWS.length,
    items: ROWS.slice(offset, offset + limit),
  };
};

const listRef = ref<InstanceType<typeof YsInfiniteList> | null>(null);

/** selection-change 同步的已选行 */
const selectedRows = ref<Record<string, unknown>[]>([]);
function onSelectionChange(rows: unknown[]): void {
  selectedRows.value = rows as Record<string, unknown>[];
}

/** 加载轨迹（最近 5 次），验证分批追加与 data-loaded 事件 */
const loadLog = ref<string[]>([]);
function onDataLoaded(limit: number, offset: number, count: number, isAppend: boolean): void {
  loadLog.value.unshift(`${isAppend ? "追加" : "首屏"} offset=${offset} limit=${limit} 本次 ${count} 行`);
  if (loadLog.value.length > 5) loadLog.value.pop();
}

function reload(): void {
  listRef.value?.reload();
}
function loadNext(): void {
  listRef.value?.loadNextPage();
}
function selectAllLoaded(): void {
  listRef.value?.selectAllOnPage();
}
function invertSelection(): void {
  listRef.value?.invertSelectionOnPage();
}
function clearSelection(): void {
  listRef.value?.clearSelection();
}
</script>

<template>
  <view class="page">
    <view class="toolbar">
      <text class="selected-count">已选 {{ selectedRows.length }} 项{{ selectedRows.length > 0 ? "：" + selectedRows.map((r) => r.name).join("、") : "" }}</text>
    </view>
    <view class="btn-row">
      <button class="btn" size="mini" @tap="reload">重新加载</button>
      <button class="btn" size="mini" @tap="loadNext">手动加载下一页</button>
      <button class="btn" size="mini" @tap="selectAllLoaded">全选已加载</button>
      <button class="btn" size="mini" @tap="invertSelection">反选</button>
      <button class="btn" size="mini" @tap="clearSelection">清空</button>
    </view>
    <view class="list-wrap">
      <YsInfiniteList
        ref="listRef"
        :data-fun="dataFun"
        :page-size="10"
        :threshold="100"
        show-checkbox
        height="100%"
        @data-loaded="(paged, append) => onDataLoaded(paged.limit, paged.offset, paged.items.length, append)"
        @selection-change="onSelectionChange"
      >
        <template #default="{ row, index }">
          <view class="row-card">
            <text class="row-index">{{ index + 1 }}</text>
            <view class="row-main">
              <text class="row-name">{{ row.name }}</text>
              <text class="row-sub">{{ row.email }} · {{ row.age }} 岁</text>
            </view>
          </view>
        </template>
      </YsInfiniteList>
    </view>
    <view class="log-bar">
      <text class="log-text">轨迹：{{ loadLog.length > 0 ? loadLog.join("；") : "（暂无）" }}</text>
    </view>
  </view>
</template>

<style lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f6f8;
}

.toolbar {
  padding: 20rpx 24rpx 8rpx;
}

.selected-count {
  font-size: 26rpx;
  color: #606266;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 12rpx 24rpx;
}

.btn {
  margin: 0;
}

.list-wrap {
  flex: 1;
  min-height: 0;
  margin: 12rpx 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  overflow: hidden;
}

.row-card {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 2rpx solid #ebeef5;
}

.row-index {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-right: 20rpx;
  border-radius: 50%;
  background-color: #f0f2f5;
  color: #909399;
  font-size: 22rpx;
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.row-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.row-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #909399;
}

.log-bar {
  padding: 12rpx 24rpx 24rpx;
}

.log-text {
  font-size: 22rpx;
  color: #909399;
}
</style>
