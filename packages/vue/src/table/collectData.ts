import { computed, onScopeDispose, ref, type Ref } from "vue";
import type {
  CollectOpenOptions,
  CollectorFunc,
  Column,
  ExportOption,
  ExportScope,
  PageFunc,
} from "@ys-knife-crud/core";

/** useCollectData 需要从组件 props 中访问的成员 */
interface CollectProps {
  readonly dataFun: PageFunc<unknown>;
  readonly collectorFunc?: CollectorFunc;
  readonly maxCollectCount: number;
}

/** useCollectData 的入参：组件内已有的响应式状态与工具函数 */
interface UseCollectDataOptions {
  props: CollectProps;
  /** 界面是否显示勾选列——决定「选中」范围是否出现 */
  selectable: Ref<boolean>;
  /** 当前页行数据 */
  currentRows: Ref<Record<string, unknown>[]>;
  /** checkbox 列当前选中的行（跨页累计） */
  selectedRows: Ref<unknown[]>;
  /** 数据总条数（驱动进度条初始分母；响应带回 totalCount 时会被修正） */
  total: Ref<number>;
  /** 总条数是否已知（dataFun 返回了 totalCount）；已知时「所有数据」选项带「共 N 条」 */
  totalKnown: Ref<boolean>;
  /** 收集所有时分页拉取的步长（独立于界面分页大小） */
  collectPageSize: Ref<number>;
  /** 是否还有下一页（决定「所有数据」选项是否出现） */
  hasMorePage: Ref<boolean>;
  /** 界面列定义：format=true 时据此对声明了 formatter 的列做值转换 */
  columns: Ref<Column[]>;
  /** 「page」范围的文案前缀；缺省「当前页的数据」 */
  pageScopeLabel?: Ref<string | undefined>;
}

/**
 * 收集数据逻辑：范围选择对话框、逐页拉取并累积、进度与取消。
 *
 * 与 useExportExcel 同构，区别在于不写文件——全部分页拉取完成后，
 * 把原始行对象数组一次性交给 collectorFunc（附范围与截断信息）。
 * 单次收集受 maxCollectCount 上限保护：达到上限即停止并标记 truncated。
 */
export function useCollectData({
  props,
  selectable,
  currentRows,
  selectedRows,
  total,
  totalKnown,
  collectPageSize,
  hasMorePage,
  columns,
  pageScopeLabel,
}: UseCollectDataOptions) {
  /** 生效的收集上限（至少 1，防御非法入参） */
  function maxCount(): number {
    return Math.max(1, Math.floor(props.maxCollectCount));
  }

  /** 收集选项：可勾选时含「选中」；只有一页时不出现「所有数据」 */
  const collectOptions = computed<ExportOption[]>(() => {
    const opts: ExportOption[] = [];
    if (selectable.value) {
      opts.push({
        value: "selected",
        label: `选中的数据（已选 ${selectedRows.value.length} 项）`,
        disabled: selectedRows.value.length === 0,
      });
    }
    opts.push({
      value: "page",
      label: `${pageScopeLabel?.value ?? "当前页的数据"}（${currentRows.value.length} 条）`,
      disabled: false,
    });
    if (hasMorePage.value) {
      opts.push({
        value: "all",
        label: totalKnown.value ? `所有数据（共 ${total.value} 条）` : "所有数据",
        disabled: false,
      });
    }
    return opts;
  });

  const collectDialogVisible = ref(false);
  /** 本次收集是否按 Column.formatter 格式化结果（openCollectDialog({format}) 控制，默认 true） */
  const formatValues = ref(true);

  /** 格式化收集结果：保留原行全部字段，仅覆盖声明了 formatter 的列；format=false 时原样返回 */
  function formatRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    if (!formatValues.value) return rows;
    const cols = columns.value.filter((c) => c.formatter);
    if (cols.length === 0) return rows;
    return rows.map((row) => {
      const out = { ...row };
      for (const c of cols) out[c.propertyPath] = c.formatter!(row, row[c.propertyPath] ?? null);
      return out;
    });
  }
  /** 「收集所有」进度状态 */
  const collecting = ref(false);
  const collectFetched = ref(0);
  const collectTotal = ref(0);
  /** 服务端是否已带回真实 totalCount（否则 total 只是界面估算值，不能当已知总数） */
  const collectTotalKnown = ref(false);

  /** 取消标记：每页返回后检查，兼容忽略 AbortSignal 的 dataFun */
  let collectCancelled = false;
  let collectAbort: AbortController | null = null;

  /** 剩余时间估算：本轮起始时刻 + 500ms 节拍 */
  let collectStartedAt = 0;
  let etaTimer: ReturnType<typeof setInterval> | null = null;
  const etaNow = ref(0);
  onScopeDispose(stopEtaTimer);

  function stopEtaTimer(): void {
    if (etaTimer != null) {
      clearInterval(etaTimer);
      etaTimer = null;
    }
  }

  /** 预计剩余秒数：总数已知且已加载至少一页后按已耗时速率外推 */
  const collectEtaSeconds = computed<number | null>(() => {
    if (!collectTotalKnown.value || collectFetched.value === 0) return null;
    const elapsed = (etaNow.value - collectStartedAt) / 1000;
    if (elapsed < 0.5) return null;
    const remaining = collectTotal.value - collectFetched.value;
    if (remaining <= 0) return null;
    return Math.max(1, Math.ceil(remaining / (collectFetched.value / elapsed)));
  });

  /** 收集进度百分比：totalCount 未知时按已收集条数滚动到 99% 封顶 */
  const collectPercent = computed(() => {
    if (collectTotalKnown.value && collectTotal.value > 0)
      return Math.min(100, Math.round((collectFetched.value / collectTotal.value) * 100));
    return collectFetched.value > 0 ? 99 : 0;
  });

  /** 点击收集入口：未传 collectorFunc 时空操作；只剩一个可用选项时跳过对话框。
   *  options.format 控制是否按 formatter 格式化结果，默认 true */
  function onCollectClick(options?: CollectOpenOptions): void {
    if (!props.collectorFunc) return;
    formatValues.value = options?.format !== false;
    const enabled = collectOptions.value.filter((o) => !o.disabled);
    if (enabled.length === 1) {
      void doCollect(enabled[0]!.value);
      return;
    }
    collectDialogVisible.value = true;
  }

  /** 按范围收集：选中 / 当前页直接回调；所有数据走逐页拉取 */
  async function doCollect(scope: ExportScope): Promise<void> {
    collectDialogVisible.value = false;
    const collector = props.collectorFunc;
    if (!collector) return;
    if (scope === "all") {
      await collectAllStreaming(collector);
      return;
    }
    const source = (scope === "selected" ? selectedRows.value : currentRows.value) as Record<string, unknown>[];
    const max = maxCount();
    const truncated = source.length > max;
    const rows = (truncated ? source.slice(0, max) : source).slice();
    await collector(formatRows(rows), { scope, truncated, maxCount: max });
  }

  /** 收集所有：循环调 dataFun 累积到数组，带进度与取消、受 maxCollectCount 上限保护；
   *  取消后不回调（已收集的数据直接丢弃） */
  async function collectAllStreaming(collector: CollectorFunc): Promise<void> {
    collecting.value = true;
    collectCancelled = false;
    collectFetched.value = 0;
    collectTotal.value = total.value;
    collectTotalKnown.value = false;
    collectStartedAt = Date.now();
    etaNow.value = collectStartedAt;
    stopEtaTimer();
    etaTimer = setInterval(() => {
      etaNow.value = Date.now();
    }, 500);
    collectAbort = new AbortController();
    const collected: Record<string, unknown>[] = [];
    const max = maxCount();
    let truncated = false;
    try {
      const limit = Math.max(1, Math.floor(collectPageSize.value));
      let offset = 0;
      for (;;) {
        const res = await props.dataFun({ limit, offset }, collectAbort.signal);
        if (res.totalCount != null) {
          collectTotal.value = res.totalCount;
          collectTotalKnown.value = true;
        }
        const items = res.items as Record<string, unknown>[];
        const remaining = max - collected.length;
        if (items.length >= remaining) {
          collected.push(...items.slice(0, remaining));
          collectFetched.value = collected.length;
          // 恰好收满且确实还有下一页/还有多余行 → 截断
          truncated = res.hasNext || items.length > remaining;
          break;
        }
        collected.push(...items);
        collectFetched.value = collected.length;
        if (collectCancelled || !res.hasNext || items.length === 0) break;
        offset += limit;
      }
    } catch (e) {
      if (!collectCancelled) throw e;
    } finally {
      collecting.value = false;
      stopEtaTimer();
      collectAbort = null;
    }
    // 用户取消：不回调
    if (collectCancelled) return;
    await collector(formatRows(collected), { scope: "all", truncated, maxCount: max });
  }

  /** 取消「收集所有」：中断后续请求，不回调 */
  function cancelCollect(): void {
    collectCancelled = true;
    collectAbort?.abort();
  }

  return {
    collectOptions,
    collectDialogVisible,
    collecting,
    collectFetched,
    collectTotal,
    collectTotalKnown,
    collectEtaSeconds,
    collectPercent,
    onCollectClick,
    doCollect,
    cancelCollect,
  };
}
