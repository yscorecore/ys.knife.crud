<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import type { PropType } from "vue";
import { ElMessage } from "element-plus";
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
import {
  ADVANCED_FILTER_KEY,
  type AdvancedFilterContext,
  type SavedQuery,
} from "./advancedFilterContext";

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
 * - 内置「保存」按钮（showSaveQuery 开关，默认 true）：保存当前条件树为
 *   命名预设（含名称+描述），保存时检查未填条件行（报红）并提示；
 *   已存查询标签的渲染由外部（如 YsFilterPanel）经 expose 的 savedQueries /
 *   applySavedQuery / removeSavedQuery 自行编排。
 *
 * 通用逻辑在 @ys.knife.crud/vue 的 useAdvancedFilter；递归渲染由
 * YsAdvancedConditionGroup 完成；本组件只做顶层 provide 与查询/重置/保存按钮编排。
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
  /** 是否渲染内置「保存」按钮，默认 true */
  showSaveQuery: { type: Boolean, default: true },
  /** 已存查询列表（v-model:saved-queries），不传则用内部状态 */
  savedQueries: {
    type: Array as PropType<SavedQuery[]>,
    default: undefined,
  },
});

const emit = defineEmits<{
  /** 查询按钮点击（或面板内回车）：携带递归聚合后的 FilterInfo */
  (e: "search", filter: FilterInfo): void;
  /** 重置按钮点击：条件树已重置为根 AND + 1 空叶 */
  (e: "reset"): void;
  /** saved-queries v-model 更新事件 */
  (e: "update:savedQueries", queries: SavedQuery[]): void;
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
 * 避免每层显式透传多个 prop。api 字段直接传 composable 返回对象，
 * 含 rootGroup/fieldTypeOf/operatorsOf/增删改/聚合 filter 等全部方法 */
provide(ADVANCED_FILTER_KEY, {
  columns: props.columns,
  optionsMap,
  loadingMap,
  api: advApi,
} satisfies AdvancedFilterContext);

function onSearch(): void {
  emit("search", filterInfo.value);
}

function onReset(): void {
  reset();
  emit("reset");
}

/* ----------------------- 保存查询（预设） -----------------------
 * 内置「保存」能力：showSaveQuery 只管按钮显隐；
 * 保存/恢复逻辑始终挂载，外部可通过 expose 的 openSaveDialog / applySavedQuery 调用。
 * 数据模型：SavedQuery = { id, name, description, group(深拷贝), filterInfo(快照) }，
 * 已存查询经 v-model:saved-queries 与外部（如 YsFilterPanel）共享，
 * 不传 prop 时 fallback 到内部 ref（standalone 用法）。
 * 深拷贝用 JSON.parse(JSON.stringify(...))：条件树是纯数据对象，无函数/循环引用。
 */

/** 内部 fallback 状态（savedQueries prop 未传时使用） */
const internalSavedQueries = ref<SavedQuery[]>([]);

/** 当前生效的已存查询列表（prop 优先，否则内部 ref） */
const savedQueriesState = computed<SavedQuery[]>(
  () => (props.savedQueries ?? internalSavedQueries.value) as SavedQuery[],
);

/** 统一写入入口：同时更新内部 ref 和 emit v-model 事件 */
function commitSavedQueries(queries: SavedQuery[]): void {
  internalSavedQueries.value = queries;
  emit("update:savedQueries", queries);
}

/** 保存对话框可见性 + 输入名称/描述 */
const saveDialogVisible = ref(false);
const saveQueryName = ref("");
const saveQueryDesc = ref("");

let savedSeq = 0;

/** 递归检查条件树中是否存在未填值（报红）的叶子 */
function hasInvalidConditions(): boolean {
  function walk(group: AdvancedConditionGroup): boolean {
    return group.children.some((child) => {
      if (isConditionGroup(child)) return walk(child);
      return advApi.isConditionEmpty(child);
    });
  }
  return walk(rootGroup.value);
}

/** 打开保存对话框（外部也可经 expose 调用） */
function openSaveDialog(): void {
  saveQueryName.value = "";
  saveQueryDesc.value = "";
  saveDialogVisible.value = true;
}

/** 确认保存：检查报红→提示；深拷贝当前 rootGroup + filterInfo 快照，加入列表 */
function confirmSaveQuery(): void {
  const name = saveQueryName.value.trim();
  if (!name) return;
  if (hasInvalidConditions()) {
    ElMessage.warning("当前存在未填值的条件行（标红），保存的预设可能不完整");
  }
  const snapshot = JSON.parse(JSON.stringify(rootGroup.value)) as AdvancedConditionGroup;
  const newQuery: SavedQuery = {
    id: `sq-${++savedSeq}`,
    name,
    description: saveQueryDesc.value.trim(),
    group: snapshot,
    filterInfo: filterInfo.value as unknown as SavedQuery["filterInfo"],
  };
  commitSavedQueries([...savedQueriesState.value, newQuery]);
  saveDialogVisible.value = false;
}

/** 应用已存查询：深拷贝保存的 group 覆盖 rootGroup，并立即触发查询 */
function applySavedQuery(sq: SavedQuery): void {
  rootGroup.value = JSON.parse(JSON.stringify(sq.group)) as AdvancedConditionGroup;
  onSearch();
}

/** 删除已存查询 */
function removeSavedQuery(id: string): void {
  commitSavedQueries(savedQueriesState.value.filter((sq) => sq.id !== id));
}

/* 对外暴露：外部经 ref 可直接读聚合 filter（自动解包为 FilterInfo）与手动 reset；
 * 额外暴露保存查询相关方法供外部调用（showSaveQuery=false 时自行实现 UI 用） */
defineExpose({
  get filter(): FilterInfo {
    return filterInfo.value;
  },
  reset: onReset,
  openSaveDialog,
  applySavedQuery,
  removeSavedQuery,
  get savedQueries(): SavedQuery[] {
    return savedQueriesState.value;
  },
});
</script>

<template>
  <div class="yk-advanced-filter" @keydown.enter="onSearch">
    <YsAdvancedConditionGroup :group="rootGroup" :level="0" />

    <div
      v-if="showSearch || showReset || showSaveQuery"
      class="yk-advanced-filter__actions"
    >
      <el-button v-if="showSearch" type="primary" @click="onSearch">
        {{ searchButtonText }}
      </el-button>
      <el-button v-if="showReset" @click="onReset">
        {{ resetButtonText }}
      </el-button>
      <el-button v-if="showSaveQuery" @click="openSaveDialog">保存</el-button>
    </div>

    <!-- 保存查询对话框 -->
    <el-dialog
      v-model="saveDialogVisible"
      title="保存查询"
      width="440px"
      append-to-body
    >
      <el-form label-position="top">
        <el-form-item label="名称">
          <el-input
            v-model="saveQueryName"
            placeholder="请输入查询名称"
            maxlength="50"
            show-word-limit
            @keydown.enter="confirmSaveQuery"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="saveQueryDesc"
            type="textarea"
            :rows="2"
            placeholder="可选，描述此查询的用途（hover 标签时显示）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!saveQueryName.trim()" @click="confirmSaveQuery">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.yk-advanced-filter {
  width: 100%;
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
