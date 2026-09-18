<script setup lang="ts">
import { ref } from "vue";
import {
  constData,
  constMetaFunc,
  type Meta,
  type PagedList,
  type TableApi,
} from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

const tableRef = ref<TableApi | null>(null);

/** 事件日志：每条 = 一次 data-loaded 触发（最新的在最上面，最多保留 8 条） */
interface LoadEvent {
  seq: number;
  time: string;
  limit: number;
  offset: number;
  totalCount: number;
  hasNext: boolean;
  itemCount: number;
}
const events = ref<LoadEvent[]>([]);
let seq = 0;

/* ---- 事件日志表：本身也用 ys-table 渲染 ---- */

/** 日志表的列元数据：Column 允许只填 propertyPath（displayName 缺省回落到 propertyPath，
 *  showForDisplay 缺省 true，displayOrder 缺省按数组顺序） */
const logMeta: Meta = {
  displayName: "data-loaded 事件日志",
  description: null,
  columns: [
    { propertyPath: "seq", displayName: "#" },
    { propertyPath: "time", displayName: "触发时间" },
    { propertyPath: "limit" },
    { propertyPath: "offset" },
    { propertyPath: "totalCount" },
    { propertyPath: "hasNext" },
    { propertyPath: "itemCount", displayName: "items.length" },
  ],
};
const logMetaFun = constMetaFunc(logMeta);

// constData 捕获 events 的数组引用：unshift/pop 原地修改，数据源看到的一直是最新内容
const logDataFun = constData<LoadEvent>(events.value);
const logTableRef = ref<TableApi | null>(null);

// 所有加载路径都会到这里：首载 / 翻页 / 切每页条数 / dataFun 变化 / reload()
function onDataLoaded(paged: PagedList<unknown>): void {
  events.value.unshift({
    seq: ++seq,
    time: new Date().toLocaleTimeString(),
    limit: paged.limit ?? 0,
    offset: paged.offset ?? 0,
    totalCount: paged.totalCount ?? 0,
    hasNext: paged.hasNext ?? false,
    itemCount: paged.items.length,
  });
  if (events.value.length > 8) events.value.pop();
  // ys-table 只在自身触发点加载数据，新事件到达后主动让日志表重载
  // （日志表未监听 data-loaded，这里不会形成事件循环）
  logTableRef.value?.reload();
}
</script>

<template>
  <DemoPageLayout
    title="数据加载事件（@data-loaded）"
    hint="Table 每次通过 dataFun 成功加载数据后触发 data-loaded 事件，携带本次分页结果（limit / offset / totalCount / hasNext / items）。下方日志本身就是用 <ys-table> 渲染的（metaFun + constData(events)），记录每一次触发：进入页面是首载，翻页、切换每页条数各触发一次，点「reload()」走组件暴露的方法同样触发。请求被取消或失败时不会触发。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="tableRef?.reload()">
        reload()（触发事件）
      </el-button>
    </template>

    <ys-table
      ref="logTableRef"
      :meta-fun="logMetaFun"
      :data-fun="logDataFun"
      :page-size="8"
      class="event-log"
    />

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      @data-loaded="onDataLoaded"
    />
  </DemoPageLayout>
</template>

<style scoped>
.event-log {
  margin-bottom: 16px;
}
</style>
