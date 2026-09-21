<script setup lang="ts">
import { inject, type PropType } from "vue";
import type {
  AdvancedCondition,
  AdvancedConditionGroup,
  AdvancedConditionNode,
  Column,
  EnumOption,
} from "@ys.knife.crud/core";
import { OPERATOR_LABELS, isConditionGroup, isNullOperator } from "@ys.knife.crud/core";
import YsAdvancedValueEditor from "./advancedValueEditor.vue";
import {
  ADVANCED_FILTER_KEY,
  type AdvancedFilterContext,
} from "./advancedFilterContext";

/**
 * YsAdvancedConditionGroup：递归子组件，渲染一个分组节点（combinator + children）。
 *
 * 在 <script setup> 配合 defineOptions({ name }) 下，模板可直接自引用
 * <YsAdvancedConditionGroup> 实现任意深度嵌套。context（columns / 选项缓存 /
 * composable api）由顶层 YsAdvancedFilterPanel 经 provide/inject
 * 注入（详见 advancedFilterContext.ts），避免每层递归显式透传。
 * 日期字段的 value-format 由 Column.displayFormat 提供（本组件按行选中字段查 column 取用）。
 *
 * children 遍历按类型分流：
 * - 叶子（AdvancedCondition）：渲染字段下拉 + 操作符下拉 + 值控件 + 删除按钮
 * - 分组（AdvancedConditionGroup）：递归渲染 <YsAdvancedConditionGroup :level="level+1">
 *
 * 模板 v-if 用 core 的 isConditionGroup（已是 type guard），Volar 据此把 v-else
 * 分支的 child 自动 narrow 为 AdvancedCondition。
 */

defineOptions({ name: "YsAdvancedConditionGroup" });

const props = defineProps({
  /** 本分组节点数据 */
  group: { type: Object as PropType<AdvancedConditionGroup>, required: true },
  /** 嵌套层级；0 = 根（无边框），>=1 = 嵌套（左侧色条 + 缩进） */
  level: { type: Number, default: 0 },
});

// 顶层 panel 必然 provide 该 context；用 ! 断言非空，模板/函数内可直接用
const ctx = inject(ADVANCED_FILTER_KEY)!;

function onCombinatorChange(comb: unknown): void {
  if (comb === "and" || comb === "or") {
    ctx.api.setGroupCombinator(props.group.id, comb);
  }
}

function onAddLeaf(): void {
  ctx.api.addLeaf(props.group.id);
}

function onAddNestedGroup(): void {
  ctx.api.addNestedGroup(props.group.id);
}

function onRemoveGroup(): void {
  ctx.api.removeNode(props.group.id);
}

function onFieldChange(leaf: AdvancedCondition, value: unknown): void {
  if (typeof value === "string") {
    ctx.api.changeField(leaf.id, value);
  }
}

function onOpChange(leaf: AdvancedCondition, value: unknown): void {
  // element-plus el-select 的 value 是 Operator 枚举值（字符串）
  ctx.api.changeOperator(leaf.id, value as never);
}

function onRemoveLeaf(id: string): void {
  ctx.api.removeNode(id);
}

// 模板内 type guard 别名（直接 re-export core 的，让 v-if 调用）
const isGroup = isConditionGroup;

// 给 v-else 分支加 cast 的辅助：把 child 当 leaf 取出，避免 Volar narrow 不生效
function asLeaf(node: AdvancedConditionNode): AdvancedCondition {
  return node as AdvancedCondition;
}

// 按字段路径查 Column（用于取 displayFormat 等列元数据）
function columnOf(propertyPath: string): Column | undefined {
  return ctx.columns.find((c) => c.propertyPath === propertyPath);
}

// 日期字段的 value-format：优先用 Column.displayFormat，缺省回落 YYYY-MM-DD
function valueFormatOf(propertyPath: string): string {
  return columnOf(propertyPath)?.displayFormat ?? "YYYY-MM-DD";
}
</script>

<template>
  <div
    class="yk-adv-group"
    :class="[`level-${level}`, { 'is-root': level === 0 }]"
  >
    <div class="yk-adv-group__header">
      <span class="yk-adv-group__comb-label">满足</span>
      <el-radio-group
        :model-value="group.combinator"
        size="small"
        @update:model-value="onCombinatorChange"
      >
        <el-radio-button value="and">全部</el-radio-button>
        <el-radio-button value="or">任一</el-radio-button>
      </el-radio-group>
      <span class="yk-adv-group__comb-label">条件</span>
      <span class="yk-adv-group__actions">
        <el-button link type="primary" @click="onAddLeaf">+ 条件</el-button>
        <el-button link type="primary" @click="onAddNestedGroup">
          + 嵌套组
        </el-button>
        <el-button v-if="level > 0" link type="danger" @click="onRemoveGroup">
          删除组
        </el-button>
      </span>
    </div>

    <div class="yk-adv-group__children">
      <template v-for="child in group.children" :key="child.id">
        <div v-if="isGroup(child)" class="yk-adv-group__nested">
          <YsAdvancedConditionGroup :group="child" :level="level + 1" />
        </div>
        <div v-else class="yk-adv-group__row">
          <el-select
            :model-value="asLeaf(child).propertyPath"
            class="yk-adv-group__field"
            placeholder="选择字段"
            filterable
            @update:model-value="onFieldChange(asLeaf(child), $event)"
          >
            <el-option
              v-for="col in ctx.columns"
              :key="col.propertyPath"
              :label="col.displayName ?? col.propertyPath"
              :value="col.propertyPath"
            />
          </el-select>

          <el-select
            :model-value="asLeaf(child).op"
            class="yk-adv-group__op"
            placeholder="操作符"
            filterable
            @update:model-value="onOpChange(asLeaf(child), $event)"
          >
            <el-option
              v-for="op in ctx.api.operatorsOf(asLeaf(child).propertyPath)"
              :key="op"
              :label="OPERATOR_LABELS[op]"
              :value="op"
            />
          </el-select>

          <YsAdvancedValueEditor
            v-if="!isNullOperator(asLeaf(child).op)"
            :field-type="ctx.api.fieldTypeOf(asLeaf(child).propertyPath)"
            :op="asLeaf(child).op"
            :options="ctx.optionsMap.value[asLeaf(child).propertyPath] ?? []"
            :options-loading="
              ctx.loadingMap.value[asLeaf(child).propertyPath] === true
            "
            :value-format="valueFormatOf(asLeaf(child).propertyPath)"
            :class="[
              'yk-adv-group__value',
              { 'is-invalid': ctx.api.isConditionEmpty(asLeaf(child)) },
            ]"
            v-model="asLeaf(child).value"
          />

          <el-button
            link
            type="danger"
            class="yk-adv-group__remove"
            @click="onRemoveLeaf(child.id)"
          >
            删除
          </el-button>
        </div>
      </template>

      <div v-if="group.children.length === 0" class="yk-adv-group__empty">
        暂无条件，点击「+ 条件」或「+ 嵌套组」
      </div>
    </div>
  </div>
</template>

<style scoped>
.yk-adv-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 嵌套层级：左侧色条 + 缩进；根级（level 0）无边框 */
.yk-adv-group.level-1,
.yk-adv-group.level-2,
.yk-adv-group.level-3,
.yk-adv-group.level-4,
.yk-adv-group.level-5 {
  padding: 8px 12px 12px 12px;
  margin-left: 8px;
  border-left: 2px solid var(--el-border-color, #dcdfe6);
  background: var(--el-fill-color-light, #fafafa);
  border-radius: 0 4px 4px 0;
}

.yk-adv-group.level-1 {
  border-left-color: var(--el-color-primary, #409eff);
}
.yk-adv-group.level-2 {
  border-left-color: var(--el-color-success, #67c23a);
}
.yk-adv-group.level-3 {
  border-left-color: var(--el-color-warning, #e6a23c);
}
.yk-adv-group.level-4 {
  border-left-color: var(--el-color-danger, #f56c6c);
}
.yk-adv-group.level-5 {
  border-left-color: var(--el-color-info, #909399);
}

.yk-adv-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.yk-adv-group__comb-label {
  font-size: 14px;
  color: var(--el-text-color-regular, #606266);
}

.yk-adv-group__actions {
  margin-left: auto;
  display: inline-flex;
  gap: 4px;
}

.yk-adv-group__children {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.yk-adv-group__nested {
  /* 嵌套子组直接由内部 .level-N 控制视觉 */
}

.yk-adv-group__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.yk-adv-group__field {
  flex: 0 0 180px;
}
.yk-adv-group__op {
  flex: 0 0 130px;
}
.yk-adv-group__value {
  flex: 1 1 auto;
  min-width: 0;
}

/* 值未填时给控件加红色边框，提示用户该行条件不会生效（不阻塞查询） */
.yk-adv-group__value.is-invalid :deep(.el-input__wrapper),
.yk-adv-group__value.is-invalid :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger, #f56c6c) inset;
}
.yk-adv-group__remove {
  flex: 0 0 auto;
}

.yk-adv-group__empty {
  padding: 8px 0;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}
</style>
