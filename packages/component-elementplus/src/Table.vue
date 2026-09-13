<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType, type Ref } from "vue";
import type {
  Action,
  CustomColumnConfigs,
  Meta,
  PagedList,
  TableApi,
  TableProps as CoreTableProps,
} from "@ys.knife.crud/core";

/**
 * Table 组件的 props = core 的 TableProps（metaFun + dataFun），
 * 另加展示相关的可选字段。
 * - metaFun：异步获取列定义（Meta）
 * - dataFun：异步获取分页数据（PagedList），表格渲染其 items
 *
 * 注意：这里刻意用「运行时 props 声明 + PropType」，而不是
 * `defineProps<Props extends CoreTableProps>()` 类型语法。
 * 原因：SFC 编译器把类型转成运行时 props 声明时，对跨包 re-export 的类型
 * （如 core 从 ys.knife.query.js 转出的 PageFunc）解析失败时会静默丢弃
 * 该 prop 成员，导致父组件传入的 dataFun 变成 fallthrough attribute，
 * 组件内 props.dataFun 为 undefined。运行时声明不依赖类型静态分析，无此问题。
 */
const props = defineProps({
  metaFun: { type: Function as PropType<CoreTableProps["metaFun"]>, required: true },
  dataFun: { type: Function as PropType<CoreTableProps["dataFun"]>, required: true },
  /** 可选。存在时在每一行最后一列显示可执行的操作 */
  rowActionsFunc: { type: Function as PropType<NonNullable<CoreTableProps["rowActionsFunc"]>>, required: false },
  /** 每页条数，默认 20；数据超过一页时表格下方自动出现分页组件 */
  pageSize: { type: Number, default: 20 },
  /** 分页组件「每页条数」下拉的可选项，默认 [10, 20, 50, 100] */
  pageSizes: { type: Array as PropType<number[]>, default: () => [10, 20, 50, 100] },
  /** 为 true 时第一列显示 checkbox（表头含全选/取消全选），默认 false */
  showCheckbox: { type: Boolean, default: false },
  /** 为 true 时显示「列设置」入口，用户可自定义列的显隐、顺序与宽度，默认 false */
  showCustomConfig: { type: Boolean, default: false },
  /** 加载列自定义配置（showCustomConfig 为 true 时使用；返回 null 按空配置处理） */
  loadCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["loadCustomConfigFun"]>>, required: false },
  /** 保存列自定义配置（showCustomConfig 为 true 时使用） */
  saveCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["saveCustomConfigFun"]>>, required: false },
  /** 外部加载态，会和组件内部加载态合并 */
  loading: { type: Boolean, default: false },
  /** 行 key，默认 "id" */
  rowKey: { type: String, default: "id" },
});

const meta = ref<Meta | null>(null);
const paged = ref<PagedList<unknown> | null>(null);
const actions = ref<Action<unknown>[]>([]);
const metaLoading = ref(false);
const dataLoading = ref(false);
const actionsLoading = ref(false);
/** 当前页码（1 基），翻页时驱动 dataFun 的 offset */
const currentPage = ref(1);
/** 当前生效的每页条数：初始取 pageSize prop，用户可在分页组件里切换 */
const innerPageSize = ref(props.pageSize);
/** checkbox 列当前选中的行（showCheckbox 为 true 时由 el-table 的 selection-change 维护；
 *  配合 selection 列的 reserve-selection，翻页后选中按 rowKey 跨页保留，此处为跨页累计值） */
const selectedRows = ref<unknown[]>([]);
/** el-table 实例引用（用于 clearSelection 等方法） */
const tableEl = ref<{ clearSelection?: () => void } | null>(null);
/** 用户自定义列配置（visible/order/width，key 为 propertyPath） */
const customConfigs = ref<CustomColumnConfigs>({});

/**
 * 最终显示的列，两层规则：
 * 1. 先看 meta：showForDisplay=true 的列才进入候选（也是列设置面板里可编辑的列）
 * 2. showCustomConfig 开启时再应用 CustomConfig：visible=false 隐藏、order 调整顺序
 */
const columns = computed(() => {
  const displayable = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
  const sorted = [...displayable].sort((a, b) => a.displayOrder - b.displayOrder);
  if (!props.showCustomConfig) return sorted;

  const cfg = customConfigs.value;
  const merged = sorted.map((col, idx) => ({ col, cfg: cfg[col.propertyPath], idx }));
  const visibleCols = merged.filter((x) => x.cfg?.visible ?? true);
  visibleCols.sort((a, b) => (a.cfg?.order ?? a.idx) - (b.cfg?.order ?? b.idx));
  return visibleCols.map((x) => x.col);
});

/** 列宽：仅 showCustomConfig 开启且配置了宽度时生效 */
function columnWidth(propertyPath: string): string | undefined {
  if (!props.showCustomConfig) return undefined;
  return customConfigs.value[propertyPath]?.width || undefined;
}

/** 当前页行数据，来自 dataFun 返回的 PagedList.items */
const rows = computed(() => (paged.value?.items ?? []) as Record<string, unknown>[]);

/** 总条数：优先 totalCount，缺失时按当前页 items 估算（hasNext 表示至少还有一页） */
const total = computed(() => {
  const p = paged.value;
  if (!p) return 0;
  if (p.totalCount != null) return p.totalCount;
  return p.offset + p.items.length + (p.hasNext ? 1 : 0);
});

/** 数据超过一页（或已知还有下一页）时自动显示分页组件。
 *  阈值取「当前每页条数」与「可选条数最小值」的较小者：
 *  用户把每页调大（如 100）后即使一页装得下，分页组件也不消失，还能再调回来 */
const showPagination = computed(() => {
  const threshold = Math.min(innerPageSize.value, ...props.pageSizes);
  return total.value > threshold || (paged.value?.hasNext ?? false);
});

async function loadMeta(signal?: AbortSignal): Promise<void> {
  metaLoading.value = true;
  try {
    meta.value = await props.metaFun(signal);
  } finally {
    metaLoading.value = false;
  }
}

async function loadData(signal?: AbortSignal): Promise<void> {
  dataLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * innerPageSize.value;
    paged.value = await props.dataFun({ limit: innerPageSize.value, offset }, signal);
  } finally {
    dataLoading.value = false;
  }
}

/** 翻页：更新页码并重新请求对应 offset 的数据 */
function onPageChange(page: number): void {
  currentPage.value = page;
  loadData();
}

/** 切换每页条数：回到第一页并按新 limit 重新请求 */
function onSizeChange(size: number): void {
  innerPageSize.value = size;
  currentPage.value = 1;
  loadData();
}

/** el-table 勾选变化（含表头全选/取消全选）时同步选中行 */
function onSelectionChange(selection: unknown[]): void {
  selectedRows.value = selection;
}

/** 清空全部选中（含其他页的选中）；el-table 会触发 selection-change 同步 selectedRows */
function clearSelection(): void {
  tableEl.value?.clearSelection?.();
}

/** 加载用户自定义列配置（loadCustomConfigFun 返回 null 按空配置处理） */
async function loadCustomConfigs(signal?: AbortSignal): Promise<void> {
  if (!props.showCustomConfig || !props.loadCustomConfigFun) {
    customConfigs.value = {};
    return;
  }
  customConfigs.value = (await props.loadCustomConfigFun(signal)) ?? {};
}

/** 列设置面板里单个可编辑列的草稿 */
interface DraftColumn {
  propertyPath: string;
  displayName: string;
  visible: boolean;
  width: string;
}

const configDialogVisible = ref(false);
const draftColumns = ref<DraftColumn[]>([]);

/**
 * 打开列设置面板。候选列 = meta 中 showForDisplay=true 的列
 * （含当前被 CustomConfig 隐藏的，方便用户重新开启；meta 层隐藏的列不出现）。
 * 列表顺序取 CustomConfig.order（缺省回落到 displayOrder 顺序）。
 */
function openConfigDialog(): void {
  const displayable = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
  const sorted = [...displayable].sort((a, b) => a.displayOrder - b.displayOrder);
  const cfg = customConfigs.value;
  const merged = sorted.map((col, idx) => ({ col, cfg: cfg[col.propertyPath], idx }));
  merged.sort((a, b) => (a.cfg?.order ?? a.idx) - (b.cfg?.order ?? b.idx));
  draftColumns.value = merged.map(({ col, cfg: c }) => ({
    propertyPath: col.propertyPath,
    displayName: col.displayName,
    visible: c?.visible ?? true,
    width: c?.width ?? "",
  }));
  configDialogVisible.value = true;
}

/** 调整草稿中某列的顺序（上移/下移） */
function moveDraft(index: number, delta: number): void {
  const target = index + delta;
  if (target < 0 || target >= draftColumns.value.length) return;
  const arr = [...draftColumns.value];
  const [item] = arr.splice(index, 1);
  arr.splice(target, 0, item!);
  draftColumns.value = arr;
}

/** 保存列设置：写入 CustomColumnConfigs（order 取面板中的行序），持久化并立即生效 */
async function saveConfigDialog(): Promise<void> {
  const configs: CustomColumnConfigs = {};
  draftColumns.value.forEach((d, i) => {
    configs[d.propertyPath] = {
      propertyPath: d.propertyPath,
      visible: d.visible,
      order: i,
      width: d.width,
    };
  });
  await props.saveCustomConfigFun?.(configs);
  customConfigs.value = configs;
  configDialogVisible.value = false;
}

async function loadActions(signal?: AbortSignal): Promise<void> {
  if (!props.rowActionsFunc) {
    actions.value = [];
    return;
  }
  actionsLoading.value = true;
  try {
    actions.value = await props.rowActionsFunc(signal);
  } finally {
    actionsLoading.value = false;
  }
}

/** 该行可见的操作（action.show 缺省视为可见） */
function visibleActions(row: unknown): Action<unknown>[] {
  return actions.value.filter((a) => a.show?.(row) ?? true);
}

/** 该操作对该行是否可用（action.enable 缺省视为可用） */
function isEnabled(action: Action<unknown>, row: unknown): boolean {
  return action.enable?.(row) ?? true;
}

/** 执行操作，完成后刷新数据（增删改类操作需要看到最新列表） */
async function runAction(action: Action<unknown>, row: unknown): Promise<void> {
  await action.execute(row);
  await loadData();
}

/** 重新加载元数据、数据、行操作与列自定义配置 */
function reload(): void {
  loadMeta();
  loadData();
  loadActions();
  loadCustomConfigs();
}

onMounted(reload);
watch(() => props.metaFun, () => loadMeta());
// 外部 pageSize 变化时同步内部值并回到第一页
watch(() => props.pageSize, (size) => {
  innerPageSize.value = size;
  currentPage.value = 1;
  loadData();
});
// 数据源变化视为全新查询：回到第一页再加载
watch(() => props.dataFun, () => {
  currentPage.value = 1;
  loadData();
});
watch(() => props.rowActionsFunc, () => loadActions());
watch(() => [props.showCustomConfig, props.loadCustomConfigFun], () => loadCustomConfigs());

/**
 * core 的 TableApi 是「父组件视角」的输出契约（状态为解包后的值），
 * 而组件内部每个状态都是 Ref。这里用映射类型把 TableApi 翻译成
 * 「实现侧形状」：方法保持原签名，状态包一层 Ref。
 * satisfies 会强制 exposed 覆盖契约的全部成员——少实现任何一个
 * 方法/状态都会编译报错；多暴露（未来新增成员）也会因多余属性报错，
 * 提醒同步更新 core 的 TableApi。
 */
type ExposedShape = {
  readonly [K in keyof TableApi]: TableApi[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : Ref<TableApi[K]>;
};

const exposed = {
  meta,
  paged,
  actions,
  currentPage,
  selectedRows,
  clearSelection,
  reload,
} satisfies ExposedShape;

defineExpose(exposed);
</script>

<template>
  <div class="yk-table">
    <!-- 跨页选中提示条：reserve-selection 下选中可能来自其他页，给用户一个总览与清空入口 -->
    <div v-if="showCheckbox && selectedRows.length > 0" class="yk-table__selection-bar">
      <span>已选 {{ selectedRows.length }} 项</span>
      <el-button link type="primary" @click="clearSelection">清空</el-button>
    </div>

    <!-- 列设置入口（showCustomConfig 为 true 时显示） -->
    <div v-if="showCustomConfig" class="yk-table__toolbar">
      <el-button link type="primary" class="yk-table__config-btn" @click="openConfigDialog">
        ⚙ 列设置
      </el-button>
    </div>

    <el-table
      ref="tableEl"
      v-loading="metaLoading || dataLoading || actionsLoading || loading"
      :data="rows"
      :row-key="rowKey"
      border
      @selection-change="onSelectionChange"
    >
      <!-- showCheckbox 为 true 时的勾选列：表头 checkbox 全选/取消全选当前页；
           reserve-selection 使翻页后选中按 rowKey 跨页保留 -->
      <el-table-column v-if="showCheckbox" type="selection" width="48" reserve-selection />
      <el-table-column
        v-for="col in columns"
        :key="col.propertyPath"
        :prop="col.propertyPath"
        :label="col.displayName"
        :width="columnWidth(col.propertyPath)"
        show-overflow-tooltip
      />
      <!-- 存在行操作时追加最后一列 -->
      <el-table-column v-if="actions.length > 0" label="操作" fixed="right">
        <template #default="{ row }">
          <el-button
            v-for="action in visibleActions(row)"
            :key="action.name"
            link
            type="primary"
            :disabled="!isEnabled(action, row)"
            @click="runAction(action, row)"
          >
            {{ action.desc }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 数据超过一页时自动显示的分页组件；sizes 支持用户切换每页条数 -->
    <el-pagination
      v-if="showPagination"
      class="yk-table__pagination"
      layout="total, sizes, prev, pager, next"
      :total="total"
      :page-sizes="pageSizes"
      :page-size="innerPageSize"
      :current-page="currentPage"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <!-- 列设置面板：勾选显隐、上移/下移调顺序、输入框调列宽 -->
    <el-dialog v-model="configDialogVisible" title="列设置" width="480px">
      <div v-for="(d, i) in draftColumns" :key="d.propertyPath" class="col-config-row">
        <el-checkbox v-model="d.visible" class="col-config-name">{{ d.displayName }}</el-checkbox>
        <el-input v-model="d.width" class="col-config-width" placeholder="宽度(如 120)" size="small" />
        <el-button link type="primary" :disabled="i === 0" @click="moveDraft(i, -1)">上移</el-button>
        <el-button link type="primary" :disabled="i === draftColumns.length - 1" @click="moveDraft(i, 1)">
          下移
        </el-button>
      </div>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" class="col-config-save" @click="saveConfigDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.yk-table__selection-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  font-size: 0.92em;
  color: #409eff;
}
.yk-table__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
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
.yk-table__pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
