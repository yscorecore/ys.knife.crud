<script setup lang="ts">
import { ref } from "vue";
import { constData, type PagedList, type TableApi } from "@ys.knife.crud/core";
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
}
</script>

<template>
  <DemoPageLayout
    title="数据加载事件（@data-loaded）"
    hint="Table 每次通过 dataFun 成功加载数据后触发 data-loaded 事件，携带本次分页结果（limit / offset / totalCount / hasNext / items）。下面的日志记录每一次触发：进入页面是首载，翻页、切换每页条数各触发一次，点「reload()」走组件暴露的方法同样触发。请求被取消或失败时不会触发。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="tableRef?.reload()">
        reload()（触发事件）
      </el-button>
    </template>

    <el-alert
      v-if="events.length === 0"
      title="尚未收到 data-loaded 事件"
      type="info"
      :closable="false"
      show-icon
    />
    <el-table v-else :data="events" size="small" class="event-log">
      <el-table-column prop="seq" label="#" width="50" />
      <el-table-column prop="time" label="触发时间" width="100" />
      <el-table-column prop="limit" label="limit" width="70" />
      <el-table-column prop="offset" label="offset" width="70" />
      <el-table-column prop="totalCount" label="totalCount" width="100" />
      <el-table-column label="hasNext" width="80">
        <template #default="{ row }">
          <el-tag :type="row.hasNext ? 'success' : 'info'" size="small">
            {{ row.hasNext }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="itemCount" label="items.length" />
    </el-table>

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
