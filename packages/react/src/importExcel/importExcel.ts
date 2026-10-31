import { useCallback, useMemo, useRef, useState } from "react";
import type {
  DataColumn,
  ImportParser,
  ImportProcessSummary,
  ImportProcessor,
  ImportRow,
} from "@ys-knife-crud/core";

export interface UseImportExcelOptions {
  /** 列定义（position → name → alias 定位） */
  columns: DataColumn[];
  /** 导入处理器（处理函数 + 批次大小） */
  processor?: ImportProcessor;
  /** Excel 文件解析器 */
  parser?: ImportParser;
}

/** 表头归一化：去空白 + 小写 */
function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/** 单元格是否「空」 */
function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null
    || (typeof value === "string" && value.trim() === "");
}

interface ResolvedColumn {
  column: DataColumn;
  index: number;
}

function resolveColumns(
  columns: DataColumn[],
  header: unknown[],
): { resolved: ResolvedColumn[]; missing: DataColumn[] } {
  const headerIndex = new Map<string, number>();
  header.forEach((cell, i) => {
    const key = normalizeHeader(cell);
    if (key !== "" && !headerIndex.has(key)) headerIndex.set(key, i);
  });

  const missing: DataColumn[] = [];
  const resolved: ResolvedColumn[] = columns.map((column) => {
    if (typeof column.position === "number") return { column, index: column.position };
    const byName = headerIndex.get(normalizeHeader(column.name));
    if (byName !== undefined) return { column, index: byName };
    if (column.alias) {
      for (const alias of column.alias) {
        const byAlias = headerIndex.get(normalizeHeader(alias));
        if (byAlias !== undefined) return { column, index: byAlias };
      }
    }
    if (column.optional) return { column, index: -1 };
    missing.push(column);
    return { column, index: -1 };
  });

  return { resolved, missing };
}

export interface UseImportExcelResult {
  rows: ImportRow[];
  fileName: string;
  sheetName: string;
  loading: boolean;
  processing: boolean;
  stopping: boolean;
  processingTotal: number;
  progressDone: number;
  progressSuccess: number;
  progressFailed: number;
  hasData: boolean;
  invalidCount: number;
  successCount: number;
  failedCount: number;
  selectedCount: number;
  pendingCount: number;
  processedCount: number;
  loadFile: (file: File) => Promise<ImportRow[]>;
  syncSelection: (selectedRows: ImportRow[]) => void;
  startProcessing: () => Promise<ImportProcessSummary | null>;
  stopProcessing: () => void;
  saveRowEdit: (row: ImportRow, inputs: Record<string, unknown>) => { row: ImportRow; errors: string[] };
  removeRow: (row: ImportRow) => void;
  clear: () => void;
}

/** 先让状态渲染出来再继续（等价于 Vue 的 nextTick） */
function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Excel 数据导入逻辑（框架无关，与 Vue 版 useImportExcel 对应）：
 * 文件解析 → 列映射/校验（valid/invalid）→ 勾选同步 →
 * 逐行业务处理（processing → success/failed，状态实时回写）。
 */
export function useImportExcel({
  columns,
  processor,
  parser,
}: UseImportExcelOptions): UseImportExcelResult {
  /** 行数据以 ref 为唯一数据源，变更后以新数组触发重渲染（同 Vue 的可变行对象语义） */
  const rowsRef = useRef<ImportRow[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [progressDone, setProgressDone] = useState(0);
  const [progressSuccess, setProgressSuccess] = useState(0);
  const [progressFailed, setProgressFailed] = useState(0);

  const resolvedColumns = useRef<ResolvedColumn[]>([]);
  const processController = useRef<AbortController | null>(null);
  const stoppingRef = useRef(false);

  const optionsRef = useRef({ columns, processor, parser });
  optionsRef.current = { columns, processor, parser };

  const commit = useCallback((): void => {
    setRows([...rowsRef.current]);
  }, []);

  /** 一列输入值 → 结构化值 + 校验错误 */
  function mapInputs(inputs: Record<string, unknown>): {
    data: Record<string, unknown>;
    errors: string[];
  } {
    const data: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const { column } of resolvedColumns.current) {
      const raw = inputs[column.name];
      if (isEmptyValue(raw)) {
        data[column.name] = undefined;
        if (!column.optional) errors.push(`「${column.name}」不能为空`);
        continue;
      }
      const value = column.valueMapper ? column.valueMapper(raw) : raw;
      data[column.name] = value;
      const validatorErrors = column.validator?.(value);
      if (validatorErrors && validatorErrors.length > 0) errors.push(...validatorErrors);
    }
    return { data, errors };
  }

  const loadFile = useCallback(async (file: File): Promise<ImportRow[]> => {
    const parse = optionsRef.current.parser;
    if (!parse) throw new Error("未提供 parser（Excel 解析器），无法加载文件");

    setLoading(true);
    try {
      const sheets = await parse(file);
      const sheet = sheets[0];
      if (!sheet || sheet.rows.length === 0) {
        throw new Error("工作表为空：首行需为表头，第二行起为数据");
      }

      const headerRow = sheet.rows[0]!;
      const { resolved, missing } = resolveColumns(
        optionsRef.current.columns,
        headerRow.values,
      );
      if (missing.length > 0) {
        throw new Error(
          `表头缺少必需列：${missing.map((c) => `「${c.name}」`).join("、")}`,
        );
      }
      resolvedColumns.current = resolved;

      const mapped: ImportRow[] = [];
      for (const sheetRow of sheet.rows.slice(1)) {
        const inputs: Record<string, unknown> = {};
        for (const { column, index } of resolvedColumns.current) {
          inputs[column.name] = index >= 0 ? sheetRow.values[index] : undefined;
        }
        const { data, errors } = mapInputs(inputs);
        const valid = errors.length === 0;
        mapped.push({
          rowNumber: sheetRow.rowNumber,
          raw: [...sheetRow.values],
          data,
          selected: valid,
          status: valid ? "valid" : "invalid",
          errors,
        });
      }

      rowsRef.current = mapped;
      setFileName(file.name);
      setSheetName(sheet.name);
      setProcessingTotal(0);
      setProgressDone(0);
      setProgressSuccess(0);
      setProgressFailed(0);
      commit();
      return mapped;
    } finally {
      setLoading(false);
    }
  }, [commit]);

  /** 同步勾选状态（UI 表格 selection-change 回传当前选中行） */
  const syncSelection = useCallback((selectedRows: ImportRow[]): void => {
    const selectedSet = new Set(selectedRows);
    for (const row of rowsRef.current) row.selected = selectedSet.has(row);
    commit();
  }, [commit]);

  /**
   * 分批处理所有「勾选且状态为 valid/failed」的行。
   */
  const startProcessing = useCallback(async (): Promise<ImportProcessSummary | null> => {
    if (processing) return null;
    const importer = optionsRef.current.processor;
    if (!importer) throw new Error("未提供 processor（导入处理器）");

    const targets = rowsRef.current.filter(
      (r) => r.selected && (r.status === "valid" || r.status === "failed"),
    );
    if (targets.length === 0) return null;

    const batch = Math.max(1, Math.floor(importer.batchSize ?? 1));
    processController.current = new AbortController();
    const signal = processController.current.signal;

    setProcessing(true);
    setStopping(false);
    stoppingRef.current = false;
    setProcessingTotal(targets.length);
    setProgressDone(0);
    setProgressSuccess(0);
    setProgressFailed(0);
    let done = 0;
    let success = 0;
    let failed = 0;
    const summary: ImportProcessSummary = {
      total: targets.length,
      success: 0,
      failed: 0,
      stopped: false,
    };
    try {
      for (let i = 0; i < targets.length; i += batch) {
        if (stoppingRef.current) {
          summary.stopped = true;
          break;
        }
        const chunk = targets.slice(i, i + batch);
        for (const row of chunk) {
          row.status = "processing";
          row.message = undefined;
        }
        commit();
        await nextTick();
        try {
          const results = await importer.process(chunk, signal);
          if (!Array.isArray(results) || results.length !== chunk.length) {
            throw new Error(
              `processor 返回结果数量（${Array.isArray(results) ? results.length : "非数组"}）`
              + `与输入行数（${chunk.length}）不一致`,
            );
          }
          chunk.forEach((row, j) => {
            const result = results[j]!;
            row.status = result.status === "failed" ? "failed" : "success";
            row.message = result.status === "failed" ? result.message : undefined;
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          for (const row of chunk) {
            row.status = "failed";
            row.message = msg;
          }
        }
        for (const row of chunk) {
          if (row.status === "failed") {
            summary.failed += 1;
            failed += 1;
          } else {
            summary.success += 1;
            success += 1;
          }
          done += 1;
        }
        setProgressDone(done);
        setProgressSuccess(success);
        setProgressFailed(failed);
        commit();
      }
      return summary;
    } finally {
      setProcessing(false);
      setStopping(false);
      stoppingRef.current = false;
      processController.current = null;
    }
  }, [processing, commit]);

  /** 停止当前处理：当前批照常完成，后续批次不再发起 */
  const stopProcessing = useCallback((): void => {
    if (!processing || stoppingRef.current) return;
    stoppingRef.current = true;
    setStopping(true);
    processController.current?.abort();
  }, [processing]);

  /** 保存对一行的编辑；返回更新后的行及本次错误数组 */
  const saveRowEdit = useCallback(
    (row: ImportRow, inputs: Record<string, unknown>): { row: ImportRow; errors: string[] } => {
      const { data, errors } = mapInputs(inputs);
      row.data = data;
      for (const { column, index } of resolvedColumns.current) {
        if (index >= 0) {
          const v = inputs[column.name];
          row.raw[index] = v === undefined || v === null ? "" : v;
        }
      }
      row.errors = errors;
      row.message = undefined;
      if (errors.length > 0) {
        row.status = "invalid";
        row.selected = false;
      } else {
        row.status = "valid";
        row.selected = true;
        row.errors = [];
      }
      commit();
      return { row, errors };
    },
    [commit],
  );

  /** 删除一行 */
  const removeRow = useCallback((row: ImportRow): void => {
    const index = rowsRef.current.indexOf(row);
    if (index >= 0) rowsRef.current.splice(index, 1);
    commit();
  }, [commit]);

  /** 清空已加载的数据与状态 */
  const clear = useCallback((): void => {
    rowsRef.current = [];
    resolvedColumns.current = [];
    setFileName("");
    setSheetName("");
    setProcessingTotal(0);
    setProgressDone(0);
    setProgressSuccess(0);
    setProgressFailed(0);
    commit();
  }, [commit]);

  const hasData = rows.length > 0;
  const invalidCount = useMemo(() => rows.filter((r) => r.status === "invalid").length, [rows]);
  const successCount = useMemo(() => rows.filter((r) => r.status === "success").length, [rows]);
  const failedCount = useMemo(() => rows.filter((r) => r.status === "failed").length, [rows]);
  const selectedCount = useMemo(() => rows.filter((r) => r.selected).length, [rows]);
  const pendingCount = useMemo(
    () => rows.filter((r) => r.selected && (r.status === "valid" || r.status === "failed")).length,
    [rows],
  );

  return {
    rows,
    fileName,
    sheetName,
    loading,
    processing,
    stopping,
    processingTotal,
    progressDone,
    progressSuccess,
    progressFailed,
    hasData,
    invalidCount,
    successCount,
    failedCount,
    selectedCount,
    pendingCount,
    processedCount: successCount + failedCount,
    loadFile,
    syncSelection,
    startProcessing,
    stopProcessing,
    saveRowEdit,
    removeRow,
    clear,
  };
}
