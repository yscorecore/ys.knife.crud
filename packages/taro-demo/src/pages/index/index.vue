<script setup lang="ts">
import { ref } from "vue";
import { YsInfinitePage } from "@ys-knife-crud/taro";
import { Operator, con, filter } from "@ys-knife-crud/core";
import type { FilterInfo, PageFunc, TableAction } from "@ys-knife-crud/core";
import ProviderFilter from "../../components/provider-filter.vue";

/**
 * 组件演示页：YsInfinitePage 三合一
 * - 顶部 FilterPanel：文本搜索 + 查询/重置 + 可折叠条件（供货商下拉）
 * - 中间 InfiniteList：100 行 mock 数据、每页 10 条，滚动加载 + 跨页行选中
 * - 底部 CommandBar：空壳子，按钮数据驱动 + 默认插槽追加选中提示条 + 刷新按钮
 */
interface MockRow {
  id: number;
  name: string;
  email: string;
  age: number;
  provider: string;
}

const PROVIDERS = ["全部供货商", "米粒（西安）", "米粒（北京）"];

const ROWS: MockRow[] = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `User${i + 1}`,
  email: `user${i + 1}@example.com`,
  age: 18 + (i % 40),
  provider: i % 2 === 0 ? "米粒（西安）" : "米粒（北京）",
}));

/* ---------------- 筛选状态 ---------------- */
const providerIndex = ref(0);
const appliedKeyword = ref("");
const appliedProviderIndex = ref(0);

function filterRows(): MockRow[] {
  const kw = appliedKeyword.value.trim().toLowerCase();
  const provider = PROVIDERS[appliedProviderIndex.value];
  return ROWS.filter((r) => {
    const matchKw = !kw || r.name.toLowerCase().includes(kw);
    const matchProvider = appliedProviderIndex.value === 0 || r.provider === provider;
    return matchKw && matchProvider;
  });
}

const dataFun: PageFunc<MockRow> = async (req) => {
  const limit = req.limit ?? 10;
  const offset = req.offset ?? 0;
  await new Promise((resolve) => setTimeout(resolve, 300));
  const rows = filterRows();
  return {
    limit,
    offset,
    totalCount: rows.length,
    hasNext: offset + limit < rows.length,
    items: rows.slice(offset, offset + limit),
  };
};

/* ---------------- InfinitePage expose ---------------- */
const pageRef = ref<InstanceType<typeof YsInfinitePage> | null>(null);

/* ---------------- 日志 ---------------- */
const loadLog = ref<string[]>([]);
const lastFilter = ref("");

function onSearch(filter: FilterInfo): void {
  // 文本框由 FilterPanel 内部维护，经 expose 的 keyword 读取当前值
  appliedKeyword.value = pageRef.value?.filterPanel?.keyword ?? "";
  appliedProviderIndex.value = providerIndex.value;
  lastFilter.value = filter.toString();
  pageRef.value?.list?.reload();
}

function onReset(): void {
  providerIndex.value = 0;
  appliedKeyword.value = "";
  appliedProviderIndex.value = 0;
  lastFilter.value = "";
  pageRef.value?.list?.reload();
}

function onDataLoaded(paged: unknown, isAppend: boolean): void {
  const p = paged as { limit: number; offset: number; items: unknown[] };
  loadLog.value.unshift(`${isAppend ? "追加" : "首屏"} offset=${p.offset} limit=${p.limit} 本次 ${p.items.length} 行`);
  if (loadLog.value.length > 5) loadLog.value.pop();
}

/* ---------------- 底部 CommandBar 的 actions ---------------- */
// CommandBar 是空壳子，execute 通过闭包抓 pageRef.list
const actions: TableAction[] = [
  {
    name: "export",
    desc: "导出 Excel",
    plain: true,
    async execute() {
      const allRows = pageRef.value?.list?.items ?? [];
      wx.showToast({ title: `将导出 ${allRows.length} 行`, icon: "none" });
      loadLog.value.unshift(`导出 Excel：${allRows.length} 行`);
      if (loadLog.value.length > 5) loadLog.value.pop();
    },
  },
  {
    name: "load-next",
    desc: "加载更多",
    async execute() {
      pageRef.value?.list?.loadNextPage();
    },
  },
];

/* ---------------- 选中状态（给底部选中提示条用） ---------------- */
const selectedCount = ref(0);
function onSelectionChange(rows: unknown[]): void {
  selectedCount.value = rows.length;
}
function onClearSelection(): void {
  pageRef.value?.list?.clearSelection();
}
function onReload(): void {
  pageRef.value?.list?.reload();
}
</script>

<template>
  <!-- 占位 input：Taro 只为「应用源码模板里出现过的原生组件」生成 WXML -->
  <input v-if="false" />

  <YsInfinitePage
    ref="pageRef"
    :data-fun="dataFun"
    :page-size="10"
    :show-checkbox="true"
    :text-filter-builder="kw => filter('name', Operator.Contains, con(kw)) as unknown as FilterInfo"
    placeholder="请输入姓名"
    :actions="actions"
    @search="onSearch"
    @reset="onReset"
    @data-loaded="onDataLoaded"
    @selection-change="onSelectionChange"
  >
    <!-- FilterPanel 条件区：供货商下拉 -->
    <template #filter-default>
      <ProviderFilter v-model="providerIndex" :options="PROVIDERS" />
    </template>

    <!-- List 默认行 -->
    <template #list-default="{ row, index }">
      <view class="row-card">
        <text class="row-index">{{ index + 1 }}</text>
        <view class="row-main">
          <text class="row-name">{{ (row as MockRow).name }}</text>
          <text class="row-sub">{{ (row as MockRow).email }} · {{ (row as MockRow).age }} 岁 · {{ (row as MockRow).provider }}</text>
        </view>
      </view>
    </template>

    <!-- CommandBar 默认插槽：选中提示条 + 刷新按钮 -->
    <template #cmd-default>
      <view v-if="selectedCount > 0" class="yk-selection-bar">
        <text class="yk-selection-bar__count">已选 {{ selectedCount }} 项</text>
        <text class="yk-selection-bar__sep">|</text>
        <text class="yk-selection-bar__btn" @tap="onClearSelection">清空</text>
      </view>
      <view class="yk-reload-btn" @tap="onReload">
        <text class="yk-reload-btn__text">刷新</text>
      </view>
    </template>
  </YsInfinitePage>
</template>

<style lang="scss">
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

/* CommandBar 插槽里的选中提示条 + 刷新按钮 */
.yk-selection-bar {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 20rpx;
  background-color: #ecf5ff;
  border: 2rpx solid #d9ecff;
  border-radius: 8rpx;
  font-size: 26rpx;
  line-height: 1;
  color: #409eff;
}
.yk-selection-bar__sep { color: #a0cfff; font-size: 24rpx; }
.yk-selection-bar__btn { font-size: 26rpx; color: #409eff; }

.yk-reload-btn {
  margin-left: auto;
  height: 64rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  background-color: #ffffff;
  border: 2rpx solid #dcdfe6;
  font-size: 28rpx;
  line-height: 1;
}
.yk-reload-btn__text { font-size: 28rpx; color: #606266; }
</style>
