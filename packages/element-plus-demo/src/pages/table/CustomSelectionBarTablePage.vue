<script setup lang="ts">
import { computed, ref } from "vue";
import { constData, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

const tableRef = ref<TableApi | null>(null);

/** 跨页累计选中的行（reserve-selection；expose 代理在模板中自动解包） */
const selectedRows = computed<UserRow[]>(
  () => (tableRef.value?.selectedRows ?? []) as UserRow[],
);
</script>

<template>
  <DemoPageLayout
    title="自定义选中提示条（showSelectionBar=false）"
    hint="showSelectionBar=false 时表格不再渲染内置的「已选 N 项 · 清空」提示条，但跨页选中累计照常（selectedRows / clearSelection 仍可用）。下面是外部自行实现的提示条——样式完全自定义（深色卡片、姓名标签），常驻占位以避免表格抖动；可跨页勾选后观察姓名标签累计，点清空调 ref.clearSelection()。"
    @back="$emit('back')"
  >
    <!-- 外部自定义选中提示条：常驻渲染（无选中时为灰色态），样式与布局由外部决定 -->
    <div class="my-selection-bar" :class="{ 'is-empty': selectedRows.length === 0 }">
      <el-icon class="my-selection-bar__icon"><svg viewBox="0 0 1024 1024" width="16" height="16">
          <path fill="currentColor"
            d="M128 128v768h768V128H128zm113.4 113.4h541.2v128H241.4v-128zm0 241.2h128v128h-128v-128zm241.2 0h300v128h-300v-128zM241.4 724.5h128v58.1h-128v-58.1zm241.2 0h300v58.1h-300v-58.1z" />
        </svg></el-icon>
      <span class="my-selection-bar__count">
        已选择 <strong>{{ selectedRows.length }}</strong> 行
      </span>
      <div class="my-selection-bar__tags">
        <el-tag v-for="row in selectedRows" :key="row.id" size="small" type="info" effect="dark" round>
          {{ row.name }}
        </el-tag>
        <span v-if="selectedRows.length === 0" class="my-selection-bar__hint">尚未勾选（可跨页累计）</span>
      </div>
      <el-button size="small" plain :disabled="selectedRows.length === 0"
        class="my-selection-bar__clear" @click="tableRef?.clearSelection()">
        清空选择
      </el-button>
    </div>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
      :show-selection-bar="false"
    />
  </DemoPageLayout>
</template>

<style scoped>
.my-selection-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, #2b3a4a, #35495e);
  color: #e8eef5;
  font-size: 14px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.my-selection-bar.is-empty {
  background: #f4f6f9;
  color: #909399;
  box-shadow: none;
}

.my-selection-bar__icon {
  font-size: 16px;
}

.my-selection-bar__count strong {
  color: #67c23a;
  font-size: 16px;
  margin: 0 2px;
}

.my-selection-bar__tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 24px;
}

.my-selection-bar__hint {
  font-size: 13px;
}

.my-selection-bar__clear {
  flex-shrink: 0;
  color: #e8eef5;
  border-color: rgb(232 238 245 / 50%);
}

.my-selection-bar__clear:hover {
  color: #fff;
  border-color: #fff;
  background: rgb(255 255 255 / 10%);
}
</style>
