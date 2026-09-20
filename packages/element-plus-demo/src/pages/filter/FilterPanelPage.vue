<script setup lang="ts">
import { ref } from "vue";
import { Operator } from "@ys.knife.crud/core";
import { YsFilterPanel, YsTextFilterItem } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";

defineEmits<{
  (e: "back"): void;
}>();

/** panel ref：经 expose 拿 filter（FilterInfo）与 reset；filter 是 ComputedRef 自动解包 */
const panelRef = ref<{ filter: { toString(): string; isEmpty(): boolean }; reset: () => void } | null>(null);

/** 最近一次搜索时捕获的 FilterInfo（toString 展示用）；与 panel.filter 实时联动可分开演示 */
const lastFilterString = ref<string>("");

function onSearch(): void {
  // search 事件携带聚合 FilterInfo；多个非空 item 经 panel 端 createAnd 聚合
  // 这里把当前 filter.toString() 落到展示位（实际场景交给后端执行）
  lastFilterString.value = panelRef.value?.filter?.toString() ?? "";
}

function onReset(): void {
  lastFilterString.value = "";
}
</script>

<template>
  <DemoPageLayout
    title="查询条件面板（FilterPanel + TextFilterItem）"
    hint="演示 YsFilterPanel 聚合多个 YsTextFilterItem 输出 FilterInfo：本期只实现文本类型 FilterItem（el-input），但每个 item 可声明不同 op。多个非空 item 的 filter 经 panel 端 createAnd 聚合，全空时返回 emptyFilter()。"
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
