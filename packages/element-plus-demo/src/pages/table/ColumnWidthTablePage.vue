<script setup lang="ts">
import { ref } from "vue";
import { constData, loadLocalStorageConfig, saveLocalStorageConfig, type CustomConfig, type saveCustomConfigFunc } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(createRows());

// 列设置（含拖动后的列宽）持久化到 localStorage，刷新页面后仍生效
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-column-width");
const baseSaveFun = saveLocalStorageConfig("yk-crud-demo-column-width");

/** 防抖保存观测：包一层计数器，连续拖多列应只看到一次保存调用 */
const saveCount = ref(0);
const lastSavedAt = ref("");
const lastConfigJson = ref("");
const saveCustomConfigFun: saveCustomConfigFunc = async (config: CustomConfig) => {
  saveCount.value += 1;
  lastSavedAt.value = new Date().toLocaleTimeString();
  lastConfigJson.value = JSON.stringify(config.columns, null, 2);
  await baseSaveFun(config);
};
</script>

<template>
  <DemoPageLayout
    title="列宽拖动（header-dragend + 防抖保存）"
    hint="鼠标拖动表头列边界调整列宽（border 表格默认可拖），松手后宽度立即写入列设置并防抖 500ms 持久化——连续拖动多列只调用一次保存接口（下方计数可见）。宽度经 localStorage 持久化，刷新页面仍保留；「⚙ 列设置」里也能看到拖动后的宽度。"
    @back="$emit('back')"
  >
    <ys-table
      :meta-fun="metaFun"
      :data-fun="dataFun"
      show-custom-config
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
    />
    <div class="save-log">
      保存接口调用次数：{{ saveCount }} 次<span v-if="lastSavedAt">，最近一次 {{ lastSavedAt }}</span>
      <pre v-if="lastConfigJson">{{ lastConfigJson }}</pre>
    </div>
  </DemoPageLayout>
</template>

<style scoped>
.save-log {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
}
.save-log pre {
  margin: 8px 0 0;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
}
</style>
