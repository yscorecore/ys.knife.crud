import { computed, ref, watch, type Ref } from "vue";
import type {
  CustomColumnConfig,
  CustomConfig,
  DraftColumn,
  Meta,
  CustomConfigProps,
} from "@ys.knife.crud/core";

/**
 * 列自定义配置逻辑：管理列的显隐、顺序、宽度以及用户默认分页大小，
 * 并提供列设置面板的状态与操作。
 *
 * @param props  组件 props（只需 showCustomConfig / loadCustomConfigFun / saveCustomConfigFun）
 * @param meta   列元数据 ref（用于获取 showForDisplay=true 的候选列）
 */
export function useCustomConfig(
  props: CustomConfigProps,
  meta: Ref<Meta | null>,
) {
  /* ---------------- 状态 ---------------- */

  /** 用户自定义配置（列的 visible/order/width，以及用户默认分页大小） */
  const customConfigs = ref<CustomConfig>({ columns: {} });

  /** 自定义配置加载态：loadCustomConfigs 进行中为 true（含 watch 触发的内部调用） */
  const customConfigLoading = ref(false);

  /**
   * 内部维护用户默认分页大小：saveConfigDialog 时读取此值一并保存；
   * loadCustomConfigs 加载到已保存的 pageSize 时会写回此 ref。
   * 初始为 undefined——只在加载到保存值或父组件调用 updateDefaultPageSize
   * 时才被设置，便于父组件区分「未保存过分页大小」与「保存过某数字」。
   */
  const defaultPageSize = ref<number | undefined>(undefined);

  /** 列设置面板显隐 */
  const configDialogVisible = ref(false);

  /** 列设置面板的草稿列（与最终 customConfigs 解耦，保存后才同步过去） */
  const draftColumns = ref<DraftColumn[]>([]);

  /* ---------------- 派生（最终显示列） ---------------- */

  /**
   * 最终显示的列，两层规则：
   * 1. 先看 meta：showForDisplay=true 的列才进入候选（也是列设置面板里可编辑的列）
   * 2. showCustomConfig 开启时再应用 CustomConfig：visible=false 隐藏、order 调整顺序、
   *    width 写到返回列对象上（表格组件直接读 col.width 设置列宽，不再单独查表）
   */
  const columns = computed(() => {
    const displayable = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
    const sorted = [...displayable].sort((a, b) => a.displayOrder - b.displayOrder);
    if (!props.showCustomConfig) return sorted;

    const cfg = customConfigs.value.columns;
    const merged = sorted.map((col, idx) => ({ col, cfg: cfg[col.propertyPath], idx }));
    const visibleCols = merged.filter((x) => x.cfg?.visible ?? true);
    visibleCols.sort((a, b) => (a.cfg?.order ?? a.idx) - (b.cfg?.order ?? b.idx));
    return visibleCols.map(({ col, cfg: c }) => ({
      ...col,
      // 空字符串视为未设置（与原 columnWidth() 行为一致：返回 undefined）
      width: c?.width || undefined,
    }));
  });

  /* ---------------- 配置加载与持久化 ---------------- */

  /** 加载用户自定义配置（含列设置与默认分页大小；返回 null 按空配置处理）。
   *  进行中将 customConfigLoading 置 true（含 watch 触发的内部调用） */
  async function loadCustomConfigs(signal?: AbortSignal): Promise<void> {
    customConfigLoading.value = true;
    try {
      if (!props.loadCustomConfigFun) {
        customConfigs.value = { columns: {} };
        return;
      }
      const loaded = (await props.loadCustomConfigFun(signal)) ?? { columns: {} };
      customConfigs.value = loaded;
      // 应用用户上次选择的每页条数
      if (loaded.pageSize !== undefined) {
        defaultPageSize.value = loaded.pageSize;
      }
    } finally {
      customConfigLoading.value = false;
    }
  }

  /**
   * 用户切换每页条数时调用：更新内部状态并持久化为默认分页大小
   * （保留已有列设置）。父组件（Table）经 defineExpose 透传此方法。 */
  function updateDefaultPageSize(size: number): void {
    defaultPageSize.value = size;
    const configs: CustomConfig = { pageSize: size, columns: customConfigs.value.columns };
    props.saveCustomConfigFun?.(configs);
    customConfigs.value = configs;
  }

  /* ---------------- 列设置面板操作 ---------------- */

  /**
   * 生成草稿：候选列 = meta 中 showForDisplay=true 的列
   * （含当前被 CustomConfig 隐藏的，方便用户重新开启；meta 层隐藏的列不出现）。
   * 列表顺序取 CustomConfig.order（缺省回落到 displayOrder 顺序）。
   */
  function generateDraftColumns(): DraftColumn[] {
    const displayable = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
    const sorted = [...displayable].sort((a, b) => a.displayOrder - b.displayOrder);
    const cfg = customConfigs.value.columns;
    const merged = sorted.map((col, idx) => ({ col, cfg: cfg[col.propertyPath], idx }));
    merged.sort((a, b) => (a.cfg?.order ?? a.idx) - (b.cfg?.order ?? b.idx));
    return merged.map(({ col, cfg: c }) => ({
      propertyPath: col.propertyPath,
      displayName: col.displayName,
      visible: c?.visible ?? true,
      width: c?.width ?? "",
    }));
  }

  /** 打开列设置面板 */
  function openConfigDialog(): void {
    draftColumns.value = generateDraftColumns();
    configDialogVisible.value = true;
  }

  /**
   * 重置草稿：恢复到「默认状态」——全部可见、按 displayOrder 排序、清空宽度。
   * 与 generateDraftColumns 的区别：忽略 CustomConfig 的 order/visible/width，
   * 直接用 meta 的 displayOrder 顺序与默认值。
   */
  function resetDraft(): void {
    const displayable = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
    const sorted = [...displayable].sort((a, b) => a.displayOrder - b.displayOrder);
    draftColumns.value = sorted.map((col) => ({
      propertyPath: col.propertyPath,
      displayName: col.displayName,
      visible: true,
      width: "",
    }));
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

  /** 保存列设置：写入 CustomConfig.columns（order 取面板中的行序），持久化并立即生效 */
  async function saveConfigDialog(): Promise<void> {
    const columns: Record<string, CustomColumnConfig> = {};
    draftColumns.value.forEach((d, i) => {
      columns[d.propertyPath] = {
        propertyPath: d.propertyPath,
        visible: d.visible,
        order: i,
        width: d.width,
      };
    });
    const configs: CustomConfig = { pageSize: defaultPageSize.value, columns };
    await props.saveCustomConfigFun?.(configs);
    customConfigs.value = configs;
    configDialogVisible.value = false;
  }

  /* ---------------- 副作用 ---------------- */

  // 外部 loadCustomConfigFun 变化时重新加载
  watch(() => props.loadCustomConfigFun, () => loadCustomConfigs());

  /* ---------------- 暴露 ----------------
   * 字段（状态 + 派生）集中在前，函数集中在后，便于消费方按类别解构。 */
  return {
    // 字段
    customConfigs,
    customConfigLoading,
    defaultPageSize,
    configDialogVisible,
    draftColumns,
    columns,
    // 函数
    loadCustomConfigs,
    updateDefaultPageSize,
    openConfigDialog,
    moveDraft,
    resetDraft,
    saveConfigDialog,
  };
}
