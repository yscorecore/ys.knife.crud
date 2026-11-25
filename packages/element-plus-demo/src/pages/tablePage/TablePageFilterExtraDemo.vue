<script setup lang="ts">
import { ref } from "vue";
import { constData, Operator, type TableAction } from "@ys-knife-crud/core";
import {
  type TablePageDataFun,
  YsTablePage,
  YsTextFilterItem,
} from "@ys-knife-crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

type ExtraMode = "default" | "custom" | "empty";

/** filter-extra 三种状态：默认按钮 / 自定义内容 / 空插槽（filter 占满） */
const extraMode = ref<ExtraMode>("default");
/** 自定义内容加宽：演示右侧区域宽度随内容自适应撑开、filter 自动收窄 */
const extraWide = ref(false);

/** YsTablePage 实例引用，用于在自定义 filter-extra 中驱动表格动作 */
const pageRef = ref<{
  table: {
    refresh: () => void;
    reload: () => void;
    openExportDialog: () => void;
    openConfigDialog: () => void;
  } | null;
} | null>(null);

/** 左侧表级命令（仅一个刷新，避免与右侧自定义内容重复） */
const actions: TableAction[] = [
  {
    name: "refresh",
    desc: "刷新",
    execute: async (table) => {
      table.refresh();
    },
  },
];

/** 姓名 contains 前端过滤，演示 filter→table 联动 */
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
    ? manyRows
    : manyRows.filter((r) => r.name.includes(extractContains(filter.toString())));
  return constData(rows)(req, signal);
};
</script>

<template>
  <DemoPageLayout
    title="filter-extra 插槽（filter 右侧自定义区域）"
    hint="YsTablePage 的 filter 区域右侧提供 #filter-extra 插槽：不传时默认渲染表格操作下拉按钮；传自定义内容则按内容宽度自适应撑开、filter 自动让出空间；传空插槽则 filter 横向占满。切换下方单选查看三种状态，勾选「加宽自定义内容」可直观看到右侧区域随内容变宽、filter 收窄。"
    @back="$emit('back')"
  >
    <div class="filter-extra-demo__toolbar">
      <el-radio-group v-model="extraMode" size="small">
        <el-radio-button value="default">默认（不传插槽）</el-radio-button>
        <el-radio-button value="custom">自定义内容</el-radio-button>
        <el-radio-button value="empty">空插槽（filter 占满）</el-radio-button>
      </el-radio-group>
      <el-checkbox
        v-if="extraMode === 'custom'"
        v-model="extraWide"
        class="filter-extra-demo__wide-check"
      >
        加宽自定义内容（演示宽度自适应）
      </el-checkbox>
    </div>

    <div class="filter-extra-demo__page">
      <ys-table-page
        ref="pageRef"
        :meta-fun="metaFun"
        :data-fun="dataFun"
        :actions="actions"
        :page-size="10"
        show-checkbox
      >
        <ys-text-filter-item
          label="姓名（contains）"
          property-path="name"
          :op="Operator.Contains"
          placeholder="输入姓名片段，如 User1、5"
        />

        <!-- filter-extra：
             - default：不提供插槽 → 走默认 YsTableActionMenuButton
             - custom：提供自定义内容，宽度自适应
             - empty：提供空插槽 → 容器 :empty 隐藏，filter 横向占满 -->
        <template v-if="extraMode !== 'default'" #filter-extra>
          <template v-if="extraMode === 'custom'">
            <div class="filter-extra-demo__extra">
              <el-button
                size="small"
                type="primary"
                @click="pageRef?.table?.openExportDialog()"
              >导出 Excel</el-button>
              <el-button
                size="small"
                @click="pageRef?.table?.openConfigDialog()"
              >列设置</el-button>
              <span v-if="extraWide" class="filter-extra-demo__wide-text">
                自定义区域宽度随内容自适应撑开，filter 自动收窄
              </span>
            </div>
          </template>
        </template>
      </ys-table-page>
    </div>
  </DemoPageLayout>
</template>

<style scoped>
.filter-extra-demo__toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.filter-extra-demo__wide-check {
  margin-left: 4px;
}

/* 让 YsTablePage 有固定高度，演示 filter/table 布局 */
.filter-extra-demo__page {
  height: 60vh;
  min-height: 420px;
}

/* 自定义右侧内容：按钮横向排列 */
.filter-extra-demo__extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-extra-demo__wide-text {
  margin-left: 8px;
  padding: 4px 10px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
  white-space: nowrap;
}
</style>
