<script setup lang="ts">
import { ref } from "vue";
import {
  type Column,
  type EnumOption,
  type EnumOptionsSource,
  Operator,
} from "@ys.knife.crud/core";
import {
  type SavedQuery,
  YsFilterPanel,
  YsTextFilterItem,
  YsDateFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
} from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";

defineEmits<{
  (e: "back"): void;
}>();

/** panel ref：经 expose 拿 filter（FilterInfo）、reset、mode */
const panelRef = ref<{
  filter: { toString(): string; isEmpty(): boolean };
  reset: () => void;
  mode: { value: "simple" | "advanced" };
} | null>(null);

const lastFilterString = ref<string>("");

/** 快速查询列表（v-model，简单模式和高级模式共享） */
const quickQueries = ref<SavedQuery[]>([]);

function disabledDateFn(d: Date): boolean {
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  thirtyAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  return d < thirtyAgo || d > now;
}

function onSearch(filter?: { toString(): string }): void {
  // 优先用事件参数（快速查询标签点击时传的是 sq.filterInfo）；
  // 无参数时（面板内回车/查询按钮）从 panelRef 读当前聚合 filter
  lastFilterString.value = (filter?.toString() ?? panelRef.value?.filter?.toString() ?? "") || "(empty)";
}

function onReset(): void {
  lastFilterString.value = "";
}

/* ---- 简单模式 filter items 的异步数据源 ---- */
async function loadStatusOptions(): Promise<EnumOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { label: "Active", value: 1 },
    { label: "Inactive", value: 2 },
    { label: "Pending", value: 3 },
    { label: "Archived", value: 4 },
  ];
}

async function loadTagOptions(): Promise<EnumOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { label: "开发", value: "dev" },
    { label: "设计", value: "design" },
    { label: "产品", value: "pm" },
    { label: "测试", value: "qa" },
  ];
}

/* ---- 高级查询模式所需的 columns / optionSources ---- */
const advancedColumns: Column[] = [
  { propertyPath: "name", displayName: "姓名", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "email", displayName: "邮箱", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "age", displayName: "年龄", dataTypeName: "number", showForDisplay: true },
  {
    propertyPath: "createdAt",
    displayName: "创建时间",
    dataTypeName: "date",
    showForDisplay: true,
  },
  {
    propertyPath: "enabled",
    displayName: "是否启用",
    dataTypeName: "boolean",
    showForDisplay: true,
  },
  {
    propertyPath: "status",
    displayName: "状态",
    dataTypeName: "string",
    showForDisplay: true,
  },
];

const advancedOptionSources: Record<string, EnumOptionsSource> = {
  status: loadStatusOptions,
};
</script>

<template>
  <DemoPageLayout
    title="可切换查询面板（简单 ↔ 高级）"
    hint="YsFilterPanel 开启 enableAdvancedFilter + showQuickQuery 后，简单模式底部也显示「快速查询」标签（与高级模式保存的预设共享 v-model:quick-queries）；切到高级模式编辑条件→点「保存」命名预设→切回简单模式→点标签即可直接触发查询，无需再切到高级模式。两种模式都经同一对 search/reset 事件向外分发 FilterInfo，外部无感。"
    @back="$emit('back')"
  >
    <ys-filter-panel
      ref="panelRef"
      :enable-advanced-filter="true"
      :show-quick-query="true"
      v-model:quick-queries="quickQueries"
      :advanced-columns="advancedColumns"
      :advanced-option-sources="advancedOptionSources"
      @search="onSearch"
      @reset="onReset"
    >
      <ys-text-filter-item
        label="姓名（contains）"
        property-path="name"
        :op="Operator.Contains"
        placeholder="输入姓名片段"
      />
      <ys-text-filter-item
        label="邮箱（endswith）"
        property-path="email"
        :op="Operator.EndsWith"
        placeholder="输入邮箱后缀"
      />
      <ys-date-filter-item
        label="生日（equals）"
        property-path="birthDate"
        :op="Operator.Equals"
        placeholder="选择生日"
      />
      <ys-date-range-filter-item
        label="创建时间（between）"
        property-path="createdAt"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :disabled-date="disabledDateFn"
      />
      <ys-enum-filter-item
        label="状态（equals）"
        property-path="status"
        :op="Operator.Equals"
        :options-source="loadStatusOptions"
        placeholder="选择状态"
      />
      <ys-enum-filter-item
        label="标签（in，多选）"
        property-path="tags"
        :op="Operator.In"
        :options-source="loadTagOptions"
        placeholder="选择标签（可多选）"
        multiple
      />
    </ys-filter-panel>

    <div class="switchable-filter-page__info">
      <p>
        当前模式：<code>{{ panelRef?.mode?.value ?? "simple" }}</code>
      </p>
      <p>
        当前 FilterInfo.toString()：
        <code>{{ panelRef?.filter?.toString() || "(empty)" }}</code>
      </p>
      <p v-if="lastFilterString">
        上次查询时提交的 FilterInfo：<code>{{ lastFilterString }}</code>
      </p>
      <p v-if="quickQueries.length">
        已保存的快速查询（{{ quickQueries.length }}）：<code>{{ quickQueries.map(q => `${q.name}${q.description ? `(${q.description})` : ""}`).join(", ") }}</code>
      </p>
    </div>
  </DemoPageLayout>
</template>

<style scoped>
.switchable-filter-page__info {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  font-size: 0.92em;
}

.switchable-filter-page__info p {
  margin: 4px 0;
  color: var(--el-text-color-regular, #606266);
}

code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
