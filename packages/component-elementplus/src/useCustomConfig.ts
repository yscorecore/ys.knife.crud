import { computed, ref, watch, type Ref } from "vue";
import type {
  CustomColumnConfig,
  CustomConfig,
  DraftColumn,
  loadCustomConfigFunc,
  saveCustomConfigFunc,
  Meta,
  CustomConfigProps,
} from "@ys.knife.crud/core";

/** useCustomConfig 需要从组件 props 中访问的成员 */


/**
 * 列自定义配置逻辑：管理列的显隐、顺序、宽度以及用户默认分页大小，
 * 并提供列设置面板的状态与操作。
 *
 * @param props  组件 props（只需 showCustomConfig / loadCustomConfigFun / saveCustomConfigFun）
 * @param meta   列元数据 ref（用于获取 showForDisplay=true 的候选列）
 * @param innerPageSize  当前生效的每页条数（用户切换分页大小时同步持久化）
 */
export function useCustomConfig(
  props: CustomConfigProps,
  meta: Ref<Meta | null>,
  innerPageSize: Ref<number>,
) {
  /** 用户自定义配置（列的 visible/order/width，以及用户默认分页大小） */
  const customConfigs = ref<CustomConfig>({ columns: {} });

  /**
   * 最终显示的列，两层规则：
   * 1. 先看 meta：showForDisplay=true 的列才进入候选（也是列设置面板里可编辑的列）
   * 2. showCustomConfig 开启时再应用 CustomConfig：visible=false 隐藏、order 调整顺序
   */
  const columns = computed(() => {
    const displayable = (meta.value?.columns ?? []).filter((c) => c.showForDisplay);
    const sorted = [...displayable].sort((a, b) => a.displayOrder - b.displayOrder);
    if (!props.showCustomConfig) return sorted;

    const cfg = customConfigs.value.columns;
    const merged = sorted.map((col, idx) => ({ col, cfg: cfg[col.propertyPath], idx }));
    const visibleCols = merged.filter((x) => x.cfg?.visible ?? true);
    visibleCols.sort((a, b) => (a.cfg?.order ?? a.idx) - (b.cfg?.order ?? b.idx));
    return visibleCols.map((x) => x.col);
  });

  /** 列宽：仅 showCustomConfig 开启且配置了宽度时生效 */
  function columnWidth(propertyPath: string): string | undefined {
    if (!props.showCustomConfig) return undefined;
    return customConfigs.value.columns[propertyPath]?.width || undefined;
  }

  /** 加载用户自定义配置（含列设置与默认分页大小；返回 null 按空配置处理） */
  async function loadCustomConfigs(signal?: AbortSignal): Promise<void> {
    if (!props.loadCustomConfigFun) {
      customConfigs.value = { columns: {} };
      return;
    }
    const loaded = (await props.loadCustomConfigFun(signal)) ?? { columns: {} };
    customConfigs.value = loaded;
    // 应用用户上次选择的每页条数
    if (loaded.pageSize !== undefined) {
      innerPageSize.value = loaded.pageSize;
    }
  }

  /** 持久化用户默认分页大小（保留已有列设置） */
  function savePageSize(size: number): void {
    const configs: CustomConfig = { pageSize: size, columns: customConfigs.value.columns };
    props.saveCustomConfigFun?.(configs);
    customConfigs.value = configs;
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
    const cfg = customConfigs.value.columns;
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
    const configs: CustomConfig = { pageSize: innerPageSize.value, columns };
    await props.saveCustomConfigFun?.(configs);
    customConfigs.value = configs;
    configDialogVisible.value = false;
  }

  // 外部 loadCustomConfigFun 变化时重新加载
  watch(() => props.loadCustomConfigFun, () => loadCustomConfigs());

  return {
    customConfigs,
    columns,
    columnWidth,
    loadCustomConfigs,
    savePageSize,
    configDialogVisible,
    draftColumns,
    openConfigDialog,
    moveDraft,
    saveConfigDialog,
  };
}
