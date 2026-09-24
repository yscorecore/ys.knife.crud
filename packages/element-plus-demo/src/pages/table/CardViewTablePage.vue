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

// v-model:view-mode 受控：Table 不内置视图切换控件，
// 由页面工具栏里的自定义控件驱动，演示「切换入口完全由外部实现」
const viewMode = ref<ViewMode>("card");
</script>

<template>
  <DemoPageLayout
    title="表格 / 卡片 / 列表视图切换（viewMode + #card / #list 插槽）"
    hint="viewMode 支持 table（默认）/ card / list 三种形态，v-model:view-mode 受控切换；Table 不内置切换控件，由上方自定义控件驱动。卡片内容经 #card 插槽自定义（作用域 { row, index }），列表视图一行一条数据、占满整行宽度，行内容经 #list 插槽自定义（本页画了头像/姓名/邮箱/年龄的横向单行布局）；不提供插槽时默认把整行 JSON 序列化显示。三种视图的 checkbox 共用同一套跨页选中——在列表里勾选后翻页、切回表格/卡片视图，选中状态都保留。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-radio-group v-model="viewMode" size="default">
        <el-radio-button value="table">表格视图</el-radio-button>
        <el-radio-button value="card">卡片视图</el-radio-button>
        <el-radio-button value="list">列表视图</el-radio-button>
      </el-radio-group>
      <el-button type="primary" @click="showSelection">查看选中</el-button>
    </template>

    <ys-table
      ref="tableRef"
      v-model:view-mode="viewMode"
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

      <!-- 自定义列表行内容：与卡片布局区分的横向单行（头像 + 姓名/邮箱 + 年龄 + #id） -->
      <template #list="{ row }">
        <div class="user-row">
          <div class="user-row__avatar">{{ (row as unknown as UserRow).name.slice(0, 1) }}</div>
          <span class="user-row__name">{{ (row as unknown as UserRow).name }}</span>
          <span class="user-row__email">{{ (row as unknown as UserRow).email }}</span>
          <el-tag size="small" type="info" effect="plain">
            {{ (row as unknown as UserRow).age }} 岁
          </el-tag>
          <span class="user-row__id">#{{ (row as unknown as UserRow).id }}</span>
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

/* ---------------- 列表视图行（横向单行布局） ---------------- */
.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.user-row__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--el-color-primary, #409eff);
  color: #fff;
  font-size: 14px;
  line-height: 32px;
  text-align: center;
  flex-shrink: 0;
}

.user-row__name {
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.user-row__email {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-row__id {
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
}
</style>
