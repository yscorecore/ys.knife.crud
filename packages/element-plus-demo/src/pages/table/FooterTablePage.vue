<script setup lang="ts">
import { ref } from "vue";
import { constData, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// paged：25 行数据 + pageSize=10，数据超过一页自动出现分页组件
const dataFun = constData(manyRows);
const tableRef = ref<TableApi | null>(null);

// 切换 footer 内容高度：演示分页垂直居中对齐效果
const tallFooter = ref(false);
</script>

<template>
  <DemoPageLayout
    title="底部插槽表格（#footer）"
    hint="表格底部栏左侧为 #footer 插槽区域，右侧为分页组件。footer 内容占剩余空间，分页优先占右侧；当 footer 内容高度超过分页时，底部栏被撑高，分页组件垂直居中对齐左侧内容。勾选下方「撑高 footer」可切换演示。"
    @back="$emit('back')"
  >
    <div class="footer-demo__toolbar">
      <el-checkbox v-model="tallFooter">撑高 footer 内容（演示分页垂直居中对齐）</el-checkbox>
    </div>

    <ys-table ref="tableRef" :meta-fun="metaFun" :data-fun="dataFun" :page-size="10">
      <template #footer>
        <div class="footer-demo__content">
          <el-tag type="info" size="small">自定义底部</el-tag>
          <span class="footer-demo__text">
            当前页 {{ tableRef?.rows.length ?? 0 }} 条 · 此区域由 #footer 插槽渲染，占分页左侧剩余空间
          </span>
          <template v-if="tallFooter">
            <div class="footer-demo__tall">
              <el-progress :percentage="70" :stroke-width="14" class="footer-demo__progress" />
              <p class="footer-demo__note">
                footer 内容过高时底部栏被撑高，右侧分页组件垂直居中对齐此区域。
              </p>
            </div>
          </template>
        </div>
      </template>
    </ys-table>
  </DemoPageLayout>
</template>

<style scoped>
.footer-demo__toolbar {
  margin-bottom: 12px;
}

.footer-demo__content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.footer-demo__text {
  line-height: 1.4;
}

/* 撑高模式：progress + 说明占独立行，使 footer 区域明显高于分页组件 */
.footer-demo__tall {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-demo__progress {
  width: 240px;
}

.footer-demo__note {
  margin: 0;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}
</style>
