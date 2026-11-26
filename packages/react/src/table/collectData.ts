import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CollectorFunc,
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

/** useCollectData 的入参：组件内已有的状态与工具函数 */
export interface UseCollectDataOptions {
  props: CollectProps;
  /** 界面是否显示勾选列——决定「选中」范围是否出现 */
  selectable: boolean;
  /** 当前页行数据 */
  currentRows: Record<string, unknown>[];
  /** checkbox 列当前选中的行（跨页累计） */
  selectedRows: unknown[];
  /** 数据总条数（进度条初始分母；响应带回 totalCount 时修正） */
  total: number;
  /** 总条数是否已知（dataFun 返回了 totalCount）；已知时「所有数据」选项带「共 N 条」 */
  totalKnown: boolean;
  /** 收集所有时分页拉取的步长 */
  collectPageSize: number;
  /** 是否还有下一页（决定「所有数据」选项是否出现） */
  hasMorePage: boolean;
  /** 「page」范围的文案前缀；缺省「当前页的数据」 */
  pageScopeLabel?: string;
}

export interface UseCollectDataResult {
  collectOptions: ExportOption[];
  collectDialogVisible: boolean;
  collecting: boolean;
  collectFetched: number;
  collectTotal: number;
  collectTotalKnown: boolean;
  collectEtaSeconds: number | null;
  collectPercent: number;
  onCollectClick: () => void;
  closeCollectDialog: () => void;
  doCollect: (scope: ExportScope) => Promise<void>;
  cancelCollect: () => void;
}

/**
 * 收集数据逻辑（React）：范围选择对话框、逐页拉取并累积、进度与取消。
 *
 * 与 useExportExcel 同构，区别在于不写文件——全部分页拉取完成后，
 * 把原始行对象数组一次性交给 collectorFunc（附范围与截断信息）。
 * 单次收集受 maxCollectCount 上限保护：达到上限即停止并标记 truncated。
 */
export function useCollectData(options: UseCollectDataOptions): UseCollectDataResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /** 生效的收集上限（至少 1，防御非法入参） */
  const maxCount = useCallback(
    (): number => Math.max(1, Math.floor(optionsRef.current.props.maxCollectCount)),
    [],
  );

  const collectOptions = useMemo<ExportOption[]>(() => {
    const opts: ExportOption[] = [];
    if (options.selectable) {
      opts.push({
        value: "selected",
        label: `选中的数据（已选 ${options.selectedRows.length} 项）`,
        disabled: options.selectedRows.length === 0,
      });
    }
    opts.push({
      value: "page",
      label: `${options.pageScopeLabel ?? "当前页的数据"}（${options.currentRows.length} 条）`,
      disabled: false,
    });
    if (options.hasMorePage) {
      opts.push({
        value: "all",
        label: options.totalKnown ? `所有数据（共 ${options.total} 条）` : "所有数据",
        disabled: false,
      });
    }
    return opts;
  }, [options.selectable, options.selectedRows.length, options.currentRows.length, options.hasMorePage, options.pageScopeLabel, options.totalKnown, options.total]);

  const [collectDialogVisible, setCollectDialogVisible] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectFetched, setCollectFetched] = useState(0);
  const [collectTotal, setCollectTotal] = useState(0);
  const [collectTotalKnown, setCollectTotalKnown] = useState(false);
  const [etaNow, setEtaNow] = useState(0);

  const collectCancelled = useRef(false);
  const collectAbort = useRef<AbortController | null>(null);
  const collectStartedAt = useRef(0);
  const etaTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopEtaTimer = useCallback((): void => {
    if (etaTimer.current != null) {
      clearInterval(etaTimer.current);
      etaTimer.current = null;
    }
  }, []);

  useEffect(() => () => stopEtaTimer(), [stopEtaTimer]);

  /** 预计剩余秒数：总数已知且已收集至少一页后按已耗时速率外推 */
  const collectEtaSeconds = useMemo<number | null>(() => {
    if (!collectTotalKnown || collectFetched === 0) return null;
    const elapsed = (etaNow - collectStartedAt.current) / 1000;
    if (elapsed < 0.5) return null;
    const remaining = collectTotal - collectFetched;
    if (remaining <= 0) return null;
    return Math.max(1, Math.ceil(remaining / (collectFetched / elapsed)));
  }, [collectTotalKnown, collectFetched, collectTotal, etaNow]);

  /** 收集进度百分比：totalCount 未知时按已收集条数滚动到 99% 封顶 */
  const collectPercent = useMemo(() => {
    if (collectTotalKnown && collectTotal > 0) {
      return Math.min(100, Math.round((collectFetched / collectTotal) * 100));
    }
    return collectFetched > 0 ? 99 : 0;
  }, [collectTotalKnown, collectTotal, collectFetched]);

  /** 收集所有：循环调 dataFun 累积，带进度与取消、受上限保护；取消后不回调 */
  const collectAllStreaming = useCallback(
    async (collector: CollectorFunc): Promise<void> => {
      setCollecting(true);
      collectCancelled.current = false;
      setCollectFetched(0);
      setCollectTotal(optionsRef.current.total);
      setCollectTotalKnown(false);
      collectStartedAt.current = Date.now();
      setEtaNow(Date.now());
      stopEtaTimer();
      etaTimer.current = setInterval(() => setEtaNow(Date.now()), 500);
      collectAbort.current = new AbortController();
      const collected: Record<string, unknown>[] = [];
      const max = maxCount();
      let truncated = false;
      try {
        const limit = Math.max(1, Math.floor(optionsRef.current.collectPageSize));
        let offset = 0;
        for (;;) {
          const res = await optionsRef.current.props.dataFun(
            { limit, offset },
            collectAbort.current.signal,
          );
          if (res.totalCount != null) {
            setCollectTotal(res.totalCount);
            setCollectTotalKnown(true);
          }
          const items = res.items as Record<string, unknown>[];
          const remaining = max - collected.length;
          if (items.length >= remaining) {
            collected.push(...items.slice(0, remaining));
            setCollectFetched(collected.length);
            // 恰好收满且确实还有下一页/还有多余行 → 截断
            truncated = res.hasNext || items.length > remaining;
            break;
          }
          collected.push(...items);
          setCollectFetched(collected.length);
          if (collectCancelled.current || !res.hasNext || items.length === 0) break;
          offset += limit;
        }
      } catch (e) {
        if (!collectCancelled.current) throw e;
      } finally {
        setCollecting(false);
        stopEtaTimer();
        collectAbort.current = null;
      }
      // 用户取消：不回调
      if (collectCancelled.current) return;
      await collector(collected, { scope: "all", truncated, maxCount: max });
    },
    [maxCount, stopEtaTimer],
  );

  /** 按范围收集：选中 / 当前页直接回调；所有数据走逐页拉取 */
  const doCollect = useCallback(
    async (scope: ExportScope): Promise<void> => {
      setCollectDialogVisible(false);
      const collector = optionsRef.current.props.collectorFunc;
      if (!collector) return;
      if (scope === "all") {
        await collectAllStreaming(collector);
        return;
      }
      const source = (scope === "selected"
        ? optionsRef.current.selectedRows
        : optionsRef.current.currentRows) as Record<string, unknown>[];
      const max = maxCount();
      const truncated = source.length > max;
      const rows = (truncated ? source.slice(0, max) : source).slice();
      await collector(rows, { scope, truncated, maxCount: max });
    },
    [collectAllStreaming, maxCount],
  );

  /** 点击收集入口：未传 collectorFunc 时空操作；只剩一个可用选项时跳过对话框 */
  const onCollectClick = useCallback((): void => {
    if (!optionsRef.current.props.collectorFunc) return;
    const enabled = collectOptions.filter((o) => !o.disabled);
    if (enabled.length === 1) {
      void doCollect(enabled[0]!.value);
      return;
    }
    setCollectDialogVisible(true);
  }, [collectOptions, doCollect]);

  const closeCollectDialog = useCallback((): void => setCollectDialogVisible(false), []);

  const cancelCollect = useCallback((): void => {
    collectCancelled.current = true;
    collectAbort.current?.abort();
  }, []);

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
    closeCollectDialog,
    doCollect,
    cancelCollect,
  };
}
