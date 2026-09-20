<script setup lang="ts">
import { ref } from "vue";
import { Operator } from "@ys.knife.crud/core";
import { YsFilterPanel, YsTextFilterItem, YsDateFilterItem, YsDateRangeFilterItem, YsEnumFilterItem } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";

defineEmits<{
  (e: "back"): void;
}>();

/** panel ref：经 expose 拿 filter（FilterInfo）与 reset；filter 是 ComputedRef 自动解包 */
const panelRef = ref<{ filter: { toString(): string; isEmpty(): boolean }; reset: () => void } | null>(null);

/** 最近一次搜索时捕获的 FilterInfo（toString 展示用）；与 panel.filter 实时联动可分开演示 */
const lastFilterString = ref<string>("");

/**
 * 日期范围 disabledDate：禁用未来日期与 30 天前的日期，演示「只能选最近 30 天内」范围限制。
 * el-date-picker 的 disabled-date 接收 Date 返回 boolean（true=禁用）。
 */
function disabledDateFn(d: Date): boolean {
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  // 30 天前的 0 点作下界，今天 23:59:59 作上界；超过该区间禁用
  thirtyAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  return d < thirtyAgo || d > now;
}

function onSearch(): void {
  // search 事件携带聚合 FilterInfo；多个非空 item 经 panel 端 createAnd 聚合
  // 这里把当前 filter.toString() 落到展示位（实际场景交给后端执行）
  lastFilterString.value = panelRef.value?.filter?.toString() ?? "";
}

function onReset(): void {
  lastFilterString.value = "";
}

/**
 * 枚举 FilterItem 异步数据源：模拟一次远程拉取，返回状态选项数组。
 * 实际场景中可替换为 fetch/axios 调用；dataFunc 只在组件 onMounted 调用一次。
 * - keyProperty: "code" → 选中值（送入 v-model 与 filter，作为 con 包装的值）
 * - valueProperty: "name" → 显示文本（el-option :label）
 */
async function loadStatusOptions(): Promise<Record<string, unknown>[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { code: 1, name: "Active" },
    { code: 2, name: "Inactive" },
    { code: 3, name: "Pending" },
    { code: 4, name: "Archived" },
  ];
}

/**
 * 枚举 FilterItem 多选模式异步数据源：返回标签选项数组。
 * 多选模式下：1 项自动用 Equals，2+ 项自动用 In（声明方 op 被忽略）。
 */
async function loadTagOptions(): Promise<Record<string, unknown>[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { id: "dev", label: "开发" },
    { id: "design", label: "设计" },
    { id: "pm", label: "产品" },
    { id: "qa", label: "测试" },
  ];
}
</script>

<template>
  <DemoPageLayout
    title="查询条件面板（FilterPanel + TextFilterItem）"
    hint="演示 YsFilterPanel 聚合多个 FilterItem 输出 FilterInfo：本期实现文本（YsTextFilterItem，op 可声明）、日期（YsDateFilterItem，op 可声明）、日期范围（YsDateRangeFilterItem，op 内部固定 Between，支持 disabledDate 范围限制）、枚举（YsEnumFilterItem，支持 single/multiple 模式，多选时 2+ 项自动用 In，1 项用 Equals，异步 dataFunc + keyProperty/valueProperty 提取选项字段）四种类型。多个非空 item 的 filter 经 panel 端 createAnd 聚合，全空时返回 emptyFilter()。"
    @back="$emit('back')"
  >
    <ys-filter-panel ref="panelRef" @search="onSearch" @reset="onReset">
      <ys-text-filter-item
        label="姓名（contains）"
        property-path="name"
        :op="Operator.Contains"
        placeholder="输入姓名片段（如 Alice）"
      />
      <ys-text-filter-item
        label="邮箱（endswith）"
        property-path="email"
        :op="Operator.EndsWith"
        placeholder="输入邮箱后缀（如 @example.com）"
      />
      <ys-text-filter-item
        label="城市（equals）"
        property-path="city"
        :op="Operator.Equals"
        placeholder="输入完整城市名（如 Beijing）"
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
        :data-func="loadStatusOptions"
        key-property="code"
        value-property="name"
        placeholder="选择状态"
      />
      <ys-enum-filter-item
        label="标签（in，多选）"
        property-path="tags"
        :op="Operator.In"
        :data-func="loadTagOptions"
        key-property="id"
        value-property="label"
        placeholder="选择标签（可多选）"
        multiple
      />
    </ys-filter-panel>

    <div class="filter-panel-page__info">
      <p>
        当前 FilterInfo.toString()：
        <code>{{ panelRef?.filter?.toString() || "(empty)" }}</code>
      </p>
      <p v-if="lastFilterString">
        上次搜索时提交的 FilterInfo：<code>{{ lastFilterString }}</code>
      </p>
    </div>
  </DemoPageLayout>
</template>

<style scoped>
.filter-panel-page__info {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  font-size: 0.92em;
}

.filter-panel-page__info p {
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
