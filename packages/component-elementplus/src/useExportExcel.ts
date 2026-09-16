import { computed, ref, type ComputedRef, type Ref } from "vue";
import {
  createConsoleExportApiFunc,
  type Column,
  type ExportApi,
  type ExportApiFunc,
  type ExportOption,
  type ExportScope,
  type Meta,
  type PageFunc,
} from "@ys.knife.crud/core";

/** useExportExcel 需要从组件 props 中访问的成员 */
interface ExportProps {
  readonly dataFun: PageFunc<unknown>;
  readonly showCheckbox: boolean;
  readonly exportApiFunc?: ExportApiFunc;
}

/** useExportExcel 的入参：组件内已有的响应式状态与工具函数 */
interface UseExportExcelOptions {
  props: ExportProps;
  /** 列元数据（表名用于 sheet 标识与导出文件名） */
  meta: Ref<Meta | null>;
  /** 当前界面显示的列（已含 meta/customConfig 两层过滤与排序，导出与其所见即所得） */
  columns: ComputedRef<Column[]>;
  /** 当前页行数据 */
  rows: ComputedRef<Record<string, unknown>[]>;
  /** checkbox 列当前选中的行（跨页累计） */
  selectedRows: Ref<unknown[]>;
  /** 数据总条数 */
  total: ComputedRef<number>;
  /** 当前生效的每页条数（导出所有时分页拉取的步长） */
  innerPageSize: Ref<number>;
  /** 分页组件是否显示（决定「导出所有」选项是否出现） */
  showPagination: ComputedRef<boolean>;
}

/**
 * 导出 Excel 逻辑：范围选择对话框、逐页拉取边拉边写、进度与取消、
 * 取消后的「保留部分文件 / 丢弃」流程。
 *
 * 组件只经 ExportApi 接口操作（renderHeader → renderRows → download/cancel），
 * 不关心底层实现；未显式传 exportApiFunc 时缺省使用 core 的控制台假实现
 * （createConsoleExportApiFunc，只在控制台打日志、不产出文件），
 * 真实导出由消费方注入（如 @ys.knife.crud/export-exceljs）。
 */
export function useExportExcel({
  props,
  meta,
  columns,
  rows,
  selectedRows,
  total,
  innerPageSize,
  showPagination,
}: UseExportExcelOptions) {
  /** 导出选项：showCheckbox=false 不含「导出选中」；数据只有一页（分页组件不显示）不含「导出所有」 */
  const exportOptions = computed<ExportOption[]>(() => {
    const opts: ExportOption[] = [];
    if (props.showCheckbox) {
      opts.push({
        value: "selected",
        label: `导出选中的数据（已选 ${selectedRows.value.length} 项）`,
        disabled: selectedRows.value.length === 0,
      });
    }
    opts.push({ value: "page", label: `导出当前页数据（${rows.value.length} 条）`, disabled: false });
    if (showPagination.value) {
      opts.push({ value: "all", label: "导出所有数据", disabled: false });
    }
    return opts;
  });

  const exportDialogVisible = ref(false);
  /** 「导出所有」进度状态 */
  const exporting = ref(false);
  const exportFetched = ref(0);
  const exportTotal = ref(0);
  /** 取消标记：每页返回后检查，兼容忽略 AbortSignal 的 dataFun */
  let exportCancelled = false;
  let exportAbort: AbortController | null = null;
  /** 取消后待处理的导出实例：用户选「保留部分文件」时 download，选「丢弃」时 cancel */
  let pendingExportApi: ExportApi | null = null;
  /** 取消后的「保留/丢弃」询问对话框 */
  const exportCancelledVisible = ref(false);
  /** 取消时已写入的数据行数（不含表头） */
  const exportCancelledRows = ref(0);

  /** 导出进度百分比：totalCount 未知时按已加载条数滚动到 99% 封顶 */
  const exportPercent = computed(() => {
    if (exportTotal.value > 0) return Math.min(100, Math.round((exportFetched.value / exportTotal.value) * 100));
    return exportFetched.value > 0 ? 99 : 0;
  });

  /** 点击导出入口：只剩一个可用选项时跳过对话框直接导出 */
  function onExportClick(): void {
    const enabled = exportOptions.value.filter((o) => !o.disabled);
    if (enabled.length === 1) {
      doExport(enabled[0]!.value);
      return;
    }
    exportDialogVisible.value = true;
  }

  /** 导出 sheet 标识：Table 导出为单 sheet，用表名作为 key（实现侧会做 Excel 非法字符清洗） */
  function exportSheetName(): string {
    return meta.value?.displayName || "数据";
  }

  /** 创建一个全新的导出实例（一次导出对应一个 ExportApi）。
   *  未显式传入 exportApiFunc 时用 core 的控制台假实现（只打日志、不产出文件） */
  function newExportApi(): ExportApi {
    if (props.exportApiFunc) return props.exportApiFunc();
    return createConsoleExportApiFunc()();
  }

  /** 一行数据的导出值：严格按界面列顺序取 propertyPath */
  function exportRowValues(row: Record<string, unknown>): unknown[] {
    return columns.value.map((c) => row[c.propertyPath] ?? null);
  }

  /** 按范围导出：选中/当前页直接写；所有数据走逐页拉取边拉边写 */
  async function doExport(scope: ExportScope): Promise<void> {
    exportDialogVisible.value = false;
    if (scope === "all") {
      await exportAllStreaming();
      return;
    }
    const data = (scope === "selected" ? selectedRows.value : rows.value) as Record<string, unknown>[];
    const api = newExportApi();
    const sheet = exportSheetName();
    await api.renderHeader({ [sheet]: columns.value });
    await api.renderRows(sheet, data.map(exportRowValues));
    await api.download(exportFileName());
  }

  /** 导出所有：循环调 dataFun，每页回来立即 renderRows 写入（边读边写），带进度与取消；
   *  取消后弹窗询问是否保留已写入的部分文件 */
  async function exportAllStreaming(): Promise<void> {
    exporting.value = true;
    exportCancelled = false;
    exportFetched.value = 0;
    exportTotal.value = total.value;
    exportAbort = new AbortController();
    const api = newExportApi();
    const sheet = exportSheetName();
    await api.renderHeader({ [sheet]: columns.value });
    try {
      const limit = innerPageSize.value;
      let offset = 0;
      for (;;) {
        const res = await props.dataFun({ limit, offset }, exportAbort.signal);
        await api.renderRows(sheet, (res.items as Record<string, unknown>[]).map(exportRowValues));
        exportFetched.value += res.items.length;
        if (res.totalCount != null) exportTotal.value = res.totalCount;
        if (exportCancelled || !res.hasNext || res.items.length === 0) break;
        offset += limit;
      }
    } catch (e) {
      if (!exportCancelled) throw e;
    } finally {
      exporting.value = false;
      exportAbort = null;
    }
    if (!exportCancelled) {
      await api.download(exportFileName());
      return;
    }
    // 已取消：询问是否保留已写入的部分文件
    exportCancelledRows.value = exportFetched.value;
    pendingExportApi = api;
    exportCancelledVisible.value = true;
  }

  /** 取消「导出所有」：中断后续请求；已写入的行进入「保留/丢弃」流程 */
  function cancelExport(): void {
    exportCancelled = true;
    exportAbort?.abort();
  }

  /** 保留部分文件：download 已写入的行（文件名加「部分」后缀） */
  async function keepPartialExport(): Promise<void> {
    exportCancelledVisible.value = false;
    const api = pendingExportApi;
    pendingExportApi = null;
    if (api) await api.download(exportFileName(true));
  }

  /** 丢弃部分文件：经 ExportApi.cancel 放弃已写入内容，不产出文件 */
  async function discardPartialExport(): Promise<void> {
    exportCancelledVisible.value = false;
    const api = pendingExportApi;
    pendingExportApi = null;
    if (api) await api.cancel();
  }

  /** 导出文件名：表名_时间戳.xlsx；部分文件加「部分」后缀 */
  function exportFileName(partial = false): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `${meta.value?.displayName || "导出数据"}_${stamp}${partial ? "_部分" : ""}.xlsx`;
  }

  return {
    exportOptions,
    exportDialogVisible,
    exporting,
    exportFetched,
    exportTotal,
    exportPercent,
    exportCancelledVisible,
    exportCancelledRows,
    onExportClick,
    doExport,
    cancelExport,
    keepPartialExport,
    discardPartialExport,
  };
}
