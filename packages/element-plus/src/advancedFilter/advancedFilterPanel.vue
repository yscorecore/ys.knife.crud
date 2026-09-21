<script setup lang="ts">
import { provide, ref, watch } from "vue";
import type { PropType } from "vue";
import type {
  AdvancedConditionGroup,
  AdvancedConditionNode,
  Column,
  EnumOption,
  EnumOptionsSource,
  FilterInfo,
} from "@ys.knife.crud/core";
import { isConditionGroup } from "@ys.knife.crud/core";
import { useAdvancedFilter } from "@ys.knife.crud/vue";
import YsAdvancedConditionGroup from "./advancedConditionGroup.vue";
import { ADVANCED_FILTER_KEY, type AdvancedFilterContext } from "./advancedFilterContext";

// 组件名统一带 ys 前缀：模板中以 <ys-advanced-filter-panel> 使用。
defineOptions({ name: "YsAdvancedFilterPanel" });

/**
 * YsAdvancedFilterPanel：高级查询面板。
 *
 * 与 YsFilterPanel（使用方在插槽里逐个摆好固定条件控件）不同，本组件只接收
 * Column[]（有哪些字段），由终端用户在运行时自由编排查询条件：
 *
 * - 树形编辑态：根 group + 嵌套子 group + 叶子条件行；每个 group 持有自己的
 *   combinator（and/or），任意深度嵌套，例如 `(a) and ((b) or (c))`
 * - 叶子 = 字段下拉（来自 columns，displayName 缺省回落 propertyPath）
 *   + 操作符下拉（按字段类型过滤，见 core 的 FIELD_TYPE_OPERATORS）
 *   + 值控件（YsAdvancedValueEditor 按字段类型/操作符切换：string→输入框/多值标签，
 *   number→数字框/区间，date→日期/日期区间，boolean→是/否，enum→带异步数据源的下拉）
 * - 每个 group 顶部有「+ 条件」「+ 嵌套组」入口，level > 0 的 group 可删
 * - 聚合：递归 buildNodeFilter；单子项透传（避免 (a) 多余括号），空组跳过
 * - 面板级 keydown.enter 等价于点击「查询」
 * - enum 字段的选项数据源经 optionSources（按 propertyPath 映射）提供，
 *   字段被选中时按需加载一次并缓存（递归遍历整棵树收集 enum 字段）
 *
 * 通用逻辑在 @ys.knife.crud/vue 的 useAdvancedFilter；递归渲染由
 * YsAdvancedConditionGroup 完成；本组件只做顶层 provide 与查询/重置按钮编排。
 */
const props = defineProps({
  /** 可供查询的字段列表（通常直接传 Meta.columns；隐藏列也可查询） */
  columns: { type: Array as PropType<Column[]>, required: true },
  /** 枚举字段数据源，按 propertyPath 映射；命中的字段按 enum 渲染 */
  optionSources: {
    type: Object as PropType<Record<string, EnumOptionsSource>>,
    required: false,
  },
  /** 是否渲染内置「查询」按钮，默认 true */
  showSearch: { type: Boolean, default: true },
  /** 是否渲染内置「重置」按钮，默认 true */
  showReset: { type: Boolean, default: true },
  /** 查询按钮文案，默认 "查询" */
  searchButtonText: { type: String, default: "查询" },
  /** 重置按钮文案，默认 "重置" */
  resetButtonText: { type: String, default: "重置" },
  /** el-date-picker value-format，默认 'YYYY-MM-DD' */
  valueFormat: { type: String, default: "YYYY-MM-DD" },
});

const emit = defineEmits<{
  /** 查询按钮点击（或面板内回车）：携带递归聚合后的 FilterInfo */
  (e: "search", filter: FilterInfo): void;
  /** 重置按钮点击：条件树已重置为根 AND + 1 空叶 */
  (e: "reset"): void;
}>();

const advApi = useAdvancedFilter(props);
const { rootGroup, fieldTypeOf, filter: filterInfo, reset } = advApi;

/* ---- enum 选项按需加载：字段被选中且类型为 enum 时加载对应数据源一次 ---- */
const optionsMap = ref<Record<string, EnumOption[]>>({});
const loadingMap = ref<Record<string, boolean>>({});

async function ensureOptions(propertyPath: string): Promise<void> {
  const src = props.optionSources?.[propertyPath];
  if (!src) return;
  // 已加载或正在加载则跳过（同步置 loading，防止同一 tick 重复请求）
  if (optionsMap.value[propertyPath] || loadingMap.value[propertyPath]) return;
  loadingMap.value[propertyPath] = true;
  try {
    optionsMap.value[propertyPath] = await src();
  } finally {
    loadingMap.value[propertyPath] = false;
  }
}

/** 递归遍历条件树，收集所有 enum 字段的 propertyPath */
function collectEnumPaths(group: AdvancedConditionGroup): string[] {
  const paths = new Set<string>();
  function walk(node: AdvancedConditionNode): void {
    if (isConditionGroup(node)) {
      node.children.forEach(walk);
    } else {
      if (fieldTypeOf(node.propertyPath) === "enum") {
        paths.add(node.propertyPath);
      }
    }
  }
  group.children.forEach(walk);
  return [...paths];
}

/* 监听整棵条件树（deep 监听字段切换/增删行），enum 字段立即触发加载。
 * immediate 覆盖 setup 初始化时的根 group。 */
watch(
  rootGroup,
  (g) => {
    for (const path of collectEnumPaths(g)) {
      void ensureOptions(path);
    }
  },
  { deep: true, immediate: true },
);

/* 通过 provide 注入共享 context，递归子组件用 inject 取用，
 * 避免每层显式透传 5 个 prop。api 字段直接传 composable 返回对象，
 * 含 rootGroup/fieldTypeOf/operatorsOf/增删改/聚合 filter 等全部方法 */
provide(ADVANCED_FILTER_KEY, {
  columns: props.columns,
  optionsMap,
  loadingMap,
  valueFormat: props.valueFormat,
  api: advApi,
} satisfies AdvancedFilterContext);

function onSearch(): void {
  emit("search", filterInfo.value);
}

function onReset(): void {
  reset();
  emit("reset");
}

/* 对外暴露：外部经 ref 可直接读聚合 filter（自动解包为 FilterInfo）与手动 reset */
defineExpose({
  get filter(): FilterInfo {
    return filterInfo.value;
  },
  reset: onReset,
});
</script>

<template>
  <div class="yk-advanced-filter" @keydown.enter="onSearch">
    <YsAdvancedConditionGroup :group="rootGroup" :level="0" />

    <div v-if="showSearch || showReset" class="yk-advanced-filter__actions">
      <el-button v-if="showSearch" type="primary" @click="onSearch">
        {{ searchButtonText }}
      </el-button>
      <el-button v-if="showReset" @click="onReset">
        {{ resetButtonText }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.yk-advanced-filter {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
}

.yk-advanced-filter__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
