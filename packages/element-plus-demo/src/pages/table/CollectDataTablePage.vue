<script setup lang="ts">
import { ref } from "vue";
import { constMetaFunc, type CollectorFunc, type Meta, type TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { delayedData, exportRows } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

/** 状态枚举：演示 formatter 把后台数字转成中文文案 */
const STATUS: Record<number, string> = { 0: "待审核", 1: "已启用", 2: "已停用" };

// 300 行 + 每次请求 200ms 延迟：收集所有逐页拉取，进度条与取消清晰可见
const rows = exportRows.map((r, i) => ({ ...r, status: i % 3 }));
const dataFun = delayedData(rows, 200);

// 状态列不写 render、只配 formatter：表格显示 / 导出 Excel / 收集（format=true）共用同一份转换
const localMetaFun = constMetaFunc({
  displayName: "用户列表",
  description: null,
  columns: [
    { propertyPath: "id", displayName: "ID" },
    { propertyPath: "name", displayName: "姓名" },
    { propertyPath: "email", displayName: "邮箱" },
    {
      propertyPath: "status",
      displayName: "状态",
      formatter: (_row, value) => STATUS[value as number] ?? String(value),
      // render 第三参 formattedValue = formatter 的结果（无 formatter 时为原始值），
      // 可在格式化文本上直接加样式；导出/收集不受 render 影响，仍是纯文本
      render: (_row, _value, formattedValue) => `● ${formattedValue}`,
    },
    { propertyPath: "age", displayName: "年龄" },
  ],
} satisfies Meta);

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
    title="取数能力：打印出库（collectorTitle 自定义标题 + formatter 值转换）"
    hint="收集数据是通用「取数」通道：标题经 collectorTitle 自定义，选项与提示文案中性化。「状态」列由后台数字经 Column.formatter 转成中文——表格显示、导出 Excel、收集数据（默认 format=true）三处共用；render 第三参 formattedValue 拿到格式化结果再加圆点。点「打印原始数据」则经 openCollectDialog({ format: false }) 拿未格式化原值。还可在应用启动时经 setDefaultFormatter((column) => ...) 按列提供默认实现；工厂返回 null 的列保持原值，仅在初始化时注册一次。「所有数据」按 collectPageSize=100 逐页拉取 300 行，maxCollectCount=250 截断为 250 条。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="tableRef?.openCollectDialog()">🖨️ 打印出库</el-button>
      <el-button @click="tableRef?.openCollectDialog({ format: false })">🖨️ 打印原始数据</el-button>
    </template>

    <div class="collect-demo">
      <ys-table
        ref="tableRef"
        :meta-fun="localMetaFun"
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
