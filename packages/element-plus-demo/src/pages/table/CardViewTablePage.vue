<script setup lang="ts">
import { ref } from "vue";
import { constData, type TableApi, type ViewMode } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun, type UserRow } from "../shared/demoData";
import { useSelectionViewer } from "../shared/useSelectionViewer";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

// ref 直接用 core 的输出契约 TableApi 类型化，不依赖组件 SFC 的 InstanceType
const tableRef = ref<TableApi | null>(null);
const { showSelection } = useSelectionViewer(tableRef);

// v-model:view-mode 受控：本页关闭内置切换控件（show-view-switch=false），
// 由页面工具栏里的自定义控件驱动，演示「切换入口完全可由外部自定义」
const viewMode = ref<ViewMode>("card");
</script>

<template>
  <DemoPageLayout
    title="表格 / 卡片视图切换（viewMode + #card 插槽）"
    hint="viewMode 支持 table（默认）与 card 两种形态，v-model:view-mode 受控切换；本页关掉了内置切换控件（show-view-switch=false），由上方自定义控件驱动。卡片内容经 #card 插槽自定义（作用域 { row, index }，本页画了头像/姓名/邮箱/年龄）；不提供插槽时默认把整行 JSON 序列化显示。卡片右上角 checkbox 与表格勾选共用同一套跨页选中——在卡片里勾选后翻页、切回表格视图，选中状态都保留。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-radio-group v-model="viewMode" size="default">
        <el-radio-button value="table">表格视图</el-radio-button>
        <el-radio-button value="card">卡片视图</el-radio-button>
      </el-radio-group>
      <el-button type="primary" @click="showSelection">查看选中</el-button>
    </template>

    <ys-table
      ref="tableRef"
      v-model:view-mode="viewMode"
      :show-view-switch="false"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
    >
      <!-- 自定义卡片内容：row 为当前页行数据（类型为 unknown，按业务结构断言使用） -->
      <template #card="{ row }">
        <div class="user-card">
          <div class="user-card__avatar">{{ (row as unknown as UserRow).name.slice(0, 1) }}</div>
          <div class="user-card__body">
            <div class="user-card__name">{{ (row as unknown as UserRow).name }}</div>
            <div class="user-card__email">{{ (row as unknown as UserRow).email }}</div>
            <el-tag size="small" type="info" effect="plain">
              {{ (row as unknown as UserRow).age }} 岁
            </el-tag>
          </div>
          <div class="user-card__id">#{{ (row as unknown as UserRow).id }}</div>
        </div>
      </template>
    </ys-table>
  </DemoPageLayout>
</template>

<style scoped>
.user-card {
  /* 右上角给卡片 checkbox 留位 */
  padding-right: 24px;
}

.user-card__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--el-color-primary, #409eff);
  color: #fff;
  font-size: 18px;
  line-height: 40px;
  text-align: center;
  flex-shrink: 0;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-card__name {
  font-weight: 600;
  font-size: 14px;
}

.user-card__email {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__id {
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
}
</style>
