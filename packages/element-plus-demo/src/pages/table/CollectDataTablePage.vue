<script setup lang="ts">
import { ref } from "vue";
import { type CollectorFunc, type TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { delayedData, exportRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// 300 行 + 每次请求 200ms 延迟：收集所有逐页拉取，进度条与取消清晰可见
const dataFun = delayedData(exportRows, 200);

const tableRef = ref<TableApi | null>(null);

/** 最近一次收集结果（展示 collectorFunc 拿到的数据） */
const lastResult = ref<{
  count: number;
  truncated: boolean;
  scope: string;
  preview: string;
} | null>(null);

/** 收集完成回调：拿到原始行对象数组 + 范围/截断信息 */
const onCollect: CollectorFunc = (rows, info) => {
  lastResult.value = {
    count: rows.length,
    truncated: info.truncated,
    scope: info.scope,
    preview: JSON.stringify(rows.slice(0, 3), null, 2),
  };
};
</script>

<template>
  <DemoPageLayout
    title="取数能力：打印出库（collectorTitle 自定义标题）"
    hint="收集数据是通用「取数」通道：标题经 collectorTitle 自定义（本例为「打印出库」），选项与提示文案中性化（选中的数据 / 当前页的数据 / 所有数据）。表格不内置入口，由上方外部按钮调用 tableRef.openCollectDialog() 打开。选择「所有数据」后按 collectPageSize=100 逐页拉取 300 行，完成时把原始行对象数组交给 collectorFunc；maxCollectCount=250，因此会被截断为 250 条并标记 truncated。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="tableRef?.openCollectDialog()">🖨️ 打印出库</el-button>
    </template>

    <div class="collect-demo">
      <ys-table
        ref="tableRef"
        :meta-fun="metaFun"
        :data-fun="dataFun"
        :page-size="10"
        show-checkbox
        :collector-func="onCollect"
        collector-title="打印出库"
        :collect-page-size="100"
        :max-collect-count="250"
      />
    </div>

    <div v-if="lastResult" class="collect-demo__result">
      <p>
        获取完成：<strong>{{ lastResult.count }}</strong> 条
        （范围：{{ lastResult.scope }}<template v-if="lastResult.truncated">，<span class="collect-demo__truncated">已按上限截断</span></template>）
      </p>
      <pre class="collect-demo__preview">{{ lastResult.preview }}</pre>
    </div>
  </DemoPageLayout>
</template>

<style scoped>
.collect-demo {
  height: 420px;
}
.collect-demo__result {
  margin-top: 12px;
  padding: 12px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
}
.collect-demo__result p {
  margin: 0 0 8px;
  font-size: 13px;
}
.collect-demo__truncated {
  color: #e6a23c;
  font-weight: 600;
}
.collect-demo__preview {
  margin: 0;
  max-height: 180px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
}
</style>
