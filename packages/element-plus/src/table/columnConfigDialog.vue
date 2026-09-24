<script setup lang="ts">
import { toRef, type PropType } from "vue";
import type { Meta, CustomConfigProps } from "@ys.knife.crud/core";
import { useCustomConfig } from "@ys.knife.crud/vue";

/**
 * 列设置对话框：勾选显隐、上移/下移调顺序、输入框调列宽。
 *
 * 自管模式（与 ExportExcelDialog 相同）：列自定义逻辑（useCustomConfig）
 * 全部内聚在本组件——加载/保存配置、草稿状态、面板操作都不外泄；
 * 父组件（Table）只经 defineExpose 拿到它需要的最小接口：
 * - columns：最终显示列（已含 customConfig 的 width，表格直接读 col.width）
 * - defaultPageSize：当前用户默认分页大小（加载到保存值时回写此 ref，
 *   父组件据此把用户保存的默认分页大小应用回 Table）
 * - updateDefaultPageSize：用户切换每页条数时持久化为默认值
 * - updateColumnWidth：拖动列宽结束（header-dragend）时写回配置并防抖持久化
 * - loadCustomConfigs：reload 时重新加载配置
 * - customConfigLoading：自定义配置加载态（loadCustomConfigs 进行中为 true）
 * - openDialog：打开列设置面板（工具栏「⚙ 列设置」按钮）
 *
 * 不再经 v-model 与父组件双向同步分页大小：组件内部维护
 * 「用户默认分页大小」状态（defaultPageSize），父组件通过读取此属性
 * 获取加载到的保存值、通过调用 updateDefaultPageSize(size) 写入新值。
 *
 * 一旦挂载即应用自定义配置；Table 不渲染「⚙ 列设置」入口，由外部经
 * TableApi.openConfigDialog() 打开本面板。
 */
const props = defineProps({
  /** 加载自定义配置（含列设置与用户默认分页大小；返回 null 按空配置处理） */
  loadCustomConfigFun: { type: Function as PropType<NonNullable<import("@ys.knife.crud/core").TableProps["loadCustomConfigFun"]>>, required: false },
  /** 保存自定义配置（含列设置与用户默认分页大小） */
  saveCustomConfigFun: { type: Function as PropType<NonNullable<import("@ys.knife.crud/core").TableProps["saveCustomConfigFun"]>>, required: false },
  /** 列元数据（候选列取 meta 中 showForDisplay=true 的列） */
  meta: { type: Object as PropType<Meta | null>, default: null },
});

/* ---------------- 自管桥接（useCustomConfig） ----------------
 * useCustomConfig 按 CustomConfigProps 形状（loadCustomConfigFun/saveCustomConfigFun）
 * 读取 props。用 getter 包一层使其能响应父组件传入 prop 的变化
 * （watch/computed 经 getter 读到最新值）。
 *
 * defaultPageSize 与 updateDefaultPageSize 也内聚在 useCustomConfig 内：
 * defaultPageSize 是「用户默认分页大小」状态（saveConfigDialog 读、
 * loadCustomConfigs 加载后写回），updateDefaultPageSize 是用户切换每页
 * 条数时的「更新状态 + 持久化」组合动作——父组件经 defineExpose 透传。 */
const customConfigProps: CustomConfigProps = {
  get loadCustomConfigFun() { return props.loadCustomConfigFun; },
  get saveCustomConfigFun() { return props.saveCustomConfigFun; },
};

const {
  // 字段（状态 + 派生）
  columns,
  customConfigLoading,
  defaultPageSize,
  configDialogVisible,
  draftColumns,
  // 函数
  loadCustomConfigs,
  updateDefaultPageSize,
  updateColumnWidth,
  openConfigDialog,
  moveDraft,
  resetDraft,
  saveConfigDialog,
} = useCustomConfig(customConfigProps, toRef(props, "meta"));

/* ---------------- 暴露 API ----------------
 * 对外只暴露父组件（Table）需要的最小接口，面板内部状态（draftColumns、
 * configDialogVisible 等）不外泄。字段在前，函数在后。 */
defineExpose({
  // 字段
  columns,
  defaultPageSize,
  customConfigLoading,
  // 函数
  updateDefaultPageSize,
  updateColumnWidth,
  loadCustomConfigs,
  openDialog: openConfigDialog,
});
</script>

<template>
  <el-dialog
    v-model="configDialogVisible"
    title="列设置"
    width="480px"
  >
    <div v-for="(d, i) in draftColumns" :key="d.propertyPath" class="col-config-row">
      <el-checkbox v-model="d.visible" class="col-config-name">{{ d.displayName }}</el-checkbox>
      <el-input v-model="d.width" class="col-config-width" placeholder="宽度(如 120)" size="small" />
      <el-button link type="primary" :disabled="i === 0" @click="moveDraft(i, -1)">上移</el-button>
      <el-button
        link
        type="primary"
        :disabled="i === draftColumns.length - 1"
        @click="moveDraft(i, 1)"
      >
        下移
      </el-button>
    </div>
    <template #footer>
      <el-button @click="resetDraft">重置</el-button>
      <el-button @click="configDialogVisible = false">取消</el-button>
      <el-button type="primary" class="col-config-save" @click="saveConfigDialog">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.col-config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
.col-config-name {
  flex: 1;
  margin-right: 0;
}
.col-config-width {
  width: 120px;
}
</style>
