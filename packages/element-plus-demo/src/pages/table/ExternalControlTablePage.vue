<script setup lang="ts">
import { computed, ref } from "vue";
import { constData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

/** 两份同结构数据源：切换绑定到 :data-fun 的函数实例，触发 Table 内部的 dataFun 监听 */
const normalRows = manyRows;
const vipRows: UserRow[] = manyRows.map((row) => ({ ...row, name: `VIP·${row.name}` }));
const normalDataFun = constData(normalRows);
const vipDataFun = constData(vipRows);

/** 数据源开关：computed 每次返回不同的函数实例 → props.dataFun 变化 → 表格回第一页重新加载 */
const vipMode = ref(false);
const currentDataFun = computed(() => (vipMode.value ? vipDataFun : normalDataFun));

/** 外部 pageSize：变化绑定到 :page-size，触发 Table 的 props.pageSize 监听
 *  （走与用户下拉切换同一路径：写为默认值、回第一页、重新加载） */
const externalPageSize = ref(10);
</script>

<template>
  <DemoPageLayout
    title="外部 prop 驱动（pageSize 变化 + 切换数据源）"
    hint="父组件改 props.pageSize：与用户在下拉里切换同一路径——写为默认分页大小、回第一页、重新加载。父组件换 :data-fun：视为全新查询，回第一页重新加载（meta 不变，仅数据换）。用下面的控件从外部改 prop，观察表格反应；表格内自己的下拉/翻页行为不受影响。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button-group style="margin-right: 16px">
        <el-button :type="externalPageSize === 10 ? 'primary' : undefined" @click="externalPageSize = 10">
          外部每页 10 条
        </el-button>
        <el-button :type="externalPageSize === 20 ? 'primary' : undefined" @click="externalPageSize = 20">
          外部每页 20 条
        </el-button>
      </el-button-group>
      <el-switch v-model="vipMode" active-text="VIP 数据源" inactive-text="普通数据源" />
    </template>

    <ys-table :meta-fun="metaFun" :data-fun="currentDataFun" :page-size="externalPageSize" />
  </DemoPageLayout>
</template>
