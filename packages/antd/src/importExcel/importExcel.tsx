import { Button, Modal, Progress, Spin, Table, Tag, message } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type {
  ChangeEvent as ReactChangeEvent,
  DragEvent as ReactDragEvent,
  Key,
  ReactNode,
} from "react";
import { useImportExcel } from "@ys-knife-crud/react";
import type {
  DataColumn,
  ImportParser,
  ImportProcessSummary,
  ImportProcessor,
  ImportRow,
  ImportRowStatus,
} from "@ys-knife-crud/core";
import { ImportRowEditDialog } from "./importRowEditDialog";
import { formatCell } from "./formatCell";
import "./importExcel.css";

/**
 * YsImportExcel —— Excel 数据导入组件（React + antd 版）。
 *
 * 流程：点击「选择 Excel 文件」（或外部经 ref 调 openFilePicker()）手动选文件，
 * 也可直接把 Excel 文件拖拽到组件上（拖入时显示遮罩提示）
 * → parser 解析第一个工作表 → 按 columns（position → name → alias）映射并逐行校验
 * → 表格展示全部行（不分页）：checkbox 列与行号列固定在左侧，
 * 状态列固定在右侧，valid 行默认勾选、invalid 行禁止勾选
 * → 点击「开始处理」按 processor.batchSize（默认 1）分批串行调用 processor.process，
 * 按 results[i] 回写 rows[i] 的成功/失败；状态列实时翻转为 处理中 / 成功 / 失败。
 *
 * 组件不绑定任何 Excel 解析库：parser 与 processor 均由外部注入。
 */
export interface ImportExcelProps {
  /** 列定义（position → name → alias 定位） */
  columns: DataColumn[];
  /** 导入处理器（处理函数 + 批次大小；单行处理只是 batchSize=1 的特例） */
  processor: ImportProcessor;
  /** Excel 文件解析器 */
  parser: ImportParser;
  /** 文件选择框 accept，默认 ".xlsx" */
  accept?: string;
  /** 逐行处理时是否自动把当前「处理中」的行滚动到可视区中部，默认 true */
  autoScroll?: boolean;
  /** 组件标题（可选，传入时在工具栏上方展示） */
  title?: string;
  /** 表格滚动区最大高度（可选；不传时按容器高度自适应） */
  maxHeight?: number | string;
  /** 文件解析完成 */
  onLoaded?: (rows: ImportRow[]) => void;
  /** 表格勾选变化 */
  onSelectionChange?: (rows: ImportRow[]) => void;
  /** 一轮处理完成 */
  onProcessed?: (summary: ImportProcessSummary) => void;
  /** 编辑保存成功 */
  onRowUpdate?: (row: ImportRow) => void;
  /** 删除一行 */
  onRowRemove?: (row: ImportRow) => void;
}

/** 通过 ref 暴露的命令式方法（与 Vue 版 defineExpose 一致） */
export interface ImportExcelHandle {
  /** 打开系统文件选择框 */
  openFilePicker: () => void;
  /** 开始处理已勾选的待处理/失败行 */
  startProcessing: () => Promise<void>;
  /** 停止处理（当前批完成后生效） */
  stopProcessing: () => void;
  /** 清空已加载的数据与状态 */
  clear: () => void;
}

/** 状态标签的文案与配色（ImportRowStatus → 展示元数据） */
const statusMeta: Record<ImportRowStatus, { label: string; color?: string }> = {
  valid: { label: "待处理" },
  invalid: { label: "校验失败", color: "red" },
  processing: { label: "处理中", color: "orange" },
  success: { label: "成功", color: "green" },
  failed: { label: "失败", color: "red" },
};

/** 毫秒 → 友好时长：<1 分钟按秒，否则 分:秒（秒数向上取整，避免末行长时间显示 0 秒） */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} 秒`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分`;
}

/** 仅当拖拽的是文件时才响应（拖选文本等不出现遮罩） */
function hasDraggedFiles(event: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function EditIcon(): ReactNode {
  return (
    <svg
      className="yk-import-excel__action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon(): ReactNode {
  return (
    <svg
      className="yk-import-excel__action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export const YsImportExcel = forwardRef<ImportExcelHandle, ImportExcelProps>(
  function YsImportExcel(props, ref) {
    const {
      columns,
      processor,
      parser,
      accept = ".xlsx",
      autoScroll = true,
      title,
      maxHeight,
    } = props;

    const {
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
      selectedCount,
      pendingCount,
      loadFile,
      syncSelection,
      saveRowEdit,
      removeRow,
      startProcessing,
      stopProcessing,
      clear,
    } = useImportExcel({ columns, processor, parser });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const sheetNameRef = useRef(sheetName);
    sheetNameRef.current = sheetName;

    // ---------------- 文件选择 / 拖拽 ----------------
    const [dragDepth, setDragDepth] = useState(0);
    const isDragging = dragDepth > 0;

    /** 校验扩展名是否在 accept（如 ".xlsx"，支持逗号分隔多个）范围内 */
    function isAcceptedFile(file: File): boolean {
      const exts = accept
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (exts.length === 0) return true;
      const name = file.name.toLowerCase();
      return exts.some((ext) => name.endsWith(ext));
    }

    /** 加载单个 Excel 文件（文件框 change 与拖拽 drop 共用） */
    async function handleFile(file: File): Promise<void> {
      if (loading) return;
      if (!isAcceptedFile(file)) {
        message.error(`仅支持 ${accept} 格式的文件`);
        return;
      }
      try {
        const loaded = await loadFile(file);
        props.onLoaded?.(loaded);
        // 等 hook 的状态提交后再读取工作表名，保证提示文案使用最新值
        setTimeout(() => {
          const sheet = sheetNameRef.current;
          message.success(
            `已加载 ${loaded.length} 行${sheet ? `（工作表「${sheet}」）` : ""}`,
          );
        }, 0);
      } catch (e) {
        message.error(e instanceof Error ? e.message : String(e));
      }
    }

    async function onFileChange(event: ReactChangeEvent<HTMLInputElement>): Promise<void> {
      const input = event.target;
      const file = input.files?.[0];
      // 立即清空 value：否则选同一个文件不会再次触发 change
      input.value = "";
      if (file) await handleFile(file);
    }

    function openFilePicker(): void {
      fileInputRef.current?.click();
    }

    function onDragEnter(event: ReactDragEvent<HTMLDivElement>): void {
      if (!hasDraggedFiles(event)) return;
      setDragDepth((depth) => depth + 1);
    }

    function onDragOver(event: ReactDragEvent<HTMLDivElement>): void {
      if (!hasDraggedFiles(event)) return;
      // 必须 preventDefault 才能触发 drop
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function onDragLeave(event: ReactDragEvent<HTMLDivElement>): void {
      if (!hasDraggedFiles(event)) return;
      setDragDepth((depth) => Math.max(0, depth - 1));
    }

    function onDrop(event: ReactDragEvent<HTMLDivElement>): void {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      setDragDepth(0);
      const file = event.dataTransfer?.files?.[0];
      if (file) void handleFile(file);
    }

    // ---------------- 处理进度条 + 预估剩余时间（仅处理中显示） ----------------
    const progressStartedAt = useRef(0);
    const [nowTick, setNowTick] = useState(0);

    useEffect(() => {
      if (!processing) return;
      progressStartedAt.current = Date.now();
      setNowTick(Date.now());
      const timer = setInterval(() => setNowTick(Date.now()), 500);
      return () => clearInterval(timer);
    }, [processing]);

    const progressPercent =
      processingTotal <= 0
        ? 0
        : Math.min(100, (progressDone / processingTotal) * 100);

    /** 预估剩余时间：已用时间 / 已完成行数 × 剩余行数；首行完成前无样本，显示「计算中」 */
    const etaText =
      !processing || progressDone === 0
        ? "预计剩余 计算中…"
        : `预计剩余 ${formatDuration(
            (nowTick - progressStartedAt.current) / progressDone *
              (processingTotal - progressDone),
          )}`;

    // ---------------- 表格高度（按容器自适应，maxHeight 可封顶） ----------------
    const [scrollY, setScrollY] = useState(360);

    useEffect(() => {
      const el = bodyRef.current;
      if (!el) return;
      const compute = (): void => {
        const headerHeight =
          el.querySelector(".ant-table-thead")?.getBoundingClientRect().height ?? 39;
        let next = Math.max(120, Math.floor(el.clientHeight - headerHeight - 1));
        if (typeof maxHeight === "number") next = Math.min(next, maxHeight);
        setScrollY(next);
      };
      compute();
      const observer = new ResizeObserver(compute);
      observer.observe(el);
      return () => observer.disconnect();
    }, [maxHeight, hasData]);

    /** 当前处理行（同一时刻只有一个 processing） */
    const processingRowNumber =
      rows.find((row) => row.status === "processing")?.rowNumber ?? null;

    // 当前处理行切换时，把它垂直滚动到表格可视区中部
    useEffect(() => {
      if (processingRowNumber === null || !autoScroll) return;
      const wrap = bodyRef.current?.querySelector<HTMLElement>(".ant-table-body");
      const tr = bodyRef.current?.querySelector<HTMLElement>(
        `.ant-table-tbody tr[data-row-key="${processingRowNumber}"]`,
      );
      if (!wrap || !tr) return;
      const wrapRect = wrap.getBoundingClientRect();
      const rowRect = tr.getBoundingClientRect();
      const maxScrollTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
      const target =
        wrap.scrollTop +
        (rowRect.top - wrapRect.top) -
        (wrap.clientHeight - rowRect.height) / 2;
      wrap.scrollTop = Math.min(maxScrollTop, Math.max(0, Math.round(target)));
    }, [processingRowNumber, autoScroll]);

    // ---------------- 勾选 / 处理 ----------------
    const selectedRowKeys: Key[] = rows
      .filter((row) => row.selected)
      .map((row) => row.rowNumber);

    /** 校验失败行禁止勾选，其余行（含失败待重试）均可勾选 */
    function isRowSelectable(row: ImportRow): boolean {
      return row.status !== "invalid";
    }

    function onSelectionChange(selectedKeys: Key[]): void {
      // 用 keys 在当前完整行集合上重算选中行：列筛选隐藏部分行时也不会丢失勾选
      const selectedRows = rows.filter((row) => selectedKeys.includes(row.rowNumber));
      syncSelection(selectedRows);
      props.onSelectionChange?.(selectedRows);
    }

    async function handleStartProcessing(): Promise<void> {
      try {
        const summary = await startProcessing();
        if (!summary) return;
        props.onProcessed?.(summary);
        if (summary.stopped) {
          const remaining = summary.total - summary.success - summary.failed;
          message.warning(
            `已停止：成功 ${summary.success} 行，失败 ${summary.failed} 行，剩余 ${remaining} 行未处理（可再次「开始处理」续跑）`,
          );
        } else if (summary.failed === 0) {
          message.success(`全部处理完成，共 ${summary.success} 行`);
        } else {
          message.warning(
            `处理完成：成功 ${summary.success} 行，失败 ${summary.failed} 行`,
          );
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : String(e));
      }
    }

    // ---------------- 失败行的编辑 / 删除 ----------------
    const [editOpen, setEditOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<ImportRow | null>(null);

    /** 仅校验失败、处理失败的行允许编辑/删除；处理进行中统一禁用避免与串行处理互相干扰 */
    function canEditRow(row: ImportRow): boolean {
      return !processing && (row.status === "invalid" || row.status === "failed");
    }

    function startEdit(row: ImportRow): void {
      if (!canEditRow(row)) return;
      setEditingRow(row);
      setEditOpen(true);
    }

    function onRowSaved(updated: ImportRow): void {
      props.onRowUpdate?.(updated);
      message.success(`第 ${updated.rowNumber} 行已修正，可重新处理`);
    }

    function onRemoveRow(row: ImportRow): void {
      if (!canEditRow(row)) return;
      Modal.confirm({
        title: "删除数据行",
        content: `确定删除第 ${row.rowNumber} 行吗？删除后不可恢复。`,
        okText: "删除",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: () => {
          removeRow(row);
          props.onRowRemove?.(row);
          message.success(`已删除第 ${row.rowNumber} 行`);
        },
      });
    }

    useImperativeHandle(ref, () => ({
      openFilePicker,
      startProcessing: handleStartProcessing,
      stopProcessing,
      clear,
    }));

    // ---------------- 表格列 ----------------
    const statusFilters = (Object.keys(statusMeta) as ImportRowStatus[]).map(
      (status) => ({
        text: `${statusMeta[status].label}（${rows.filter((r) => r.status === status).length}）`,
        value: status,
      }),
    );

    const tableColumns: TableColumnsType<ImportRow> = [
      // 数据序号（从 1 开始，与是否有表头/空行无关）；title 保留真实 Excel 行号便于溯源
      {
        title: "行号",
        key: "rowNumber",
        width: 70,
        align: "center",
        fixed: "left",
        render: (_value, row, index) => (
          <span title={`Excel 第 ${row.rowNumber} 行`}>{index + 1}</span>
        ),
      },
      ...columns.map<TableColumnsType<ImportRow>[number]>((col) => ({
        title: col.name,
        key: col.name,
        width: 120,
        ellipsis: { showTitle: true },
        render: (_value, row) => formatCell(row.data[col.name]),
      })),
      {
        title: "状态",
        key: "status",
        dataIndex: "status",
        width: 200,
        fixed: "right",
        className: "yk-import-excel__status-cell",
        filters: statusFilters,
        filterMultiple: false,
        onFilter: (value, row) => row.status === value,
        render: (_value, row) => {
          const meta = statusMeta[row.status];
          return (
            <>
              <Tag color={meta.color}>
                {row.status === "processing" ? (
                  <span className="yk-import-excel__spin" />
                ) : null}
                {meta.label}
              </Tag>
              {row.status === "invalid" ? (
                <div className="yk-import-excel__msg yk-import-excel__msg--danger">
                  {row.errors.join("；")}
                </div>
              ) : row.message ? (
                <div className="yk-import-excel__msg yk-import-excel__msg--danger">
                  {row.message}
                </div>
              ) : null}
            </>
          );
        },
      },
      // 操作列：仅校验失败/处理失败行提供编辑、删除，处理中禁用
      {
        title: "操作",
        key: "action",
        width: 110,
        align: "center",
        fixed: "right",
        render: (_value, row) =>
          canEditRow(row) ? (
            <div className="yk-import-excel__actions">
              <Button
                type="link"
                size="small"
                icon={<EditIcon />}
                onClick={() => startEdit(row)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteIcon />}
                onClick={() => onRemoveRow(row)}
              >
                删除
              </Button>
            </div>
          ) : (
            <span className="yk-import-excel__action-placeholder">—</span>
          ),
      },
    ];

    const rowSelection: NonNullable<TableProps<ImportRow>["rowSelection"]> = {
      selectedRowKeys,
      columnWidth: 44,
      getCheckboxProps: (row) => ({ disabled: !isRowSelectable(row) }),
      onChange: onSelectionChange,
    };

    return (
      <div
        className="yk-import-excel"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          className="yk-import-excel__file"
          type="file"
          accept={accept}
          onChange={onFileChange}
        />

        {title ? <div className="yk-import-excel__title">{title}</div> : null}

        <div className="yk-import-excel__toolbar">
          <Button type="primary" loading={loading} onClick={openFilePicker}>
            选择 Excel 文件
          </Button>
          <Button
            type="primary"
            loading={processing}
            disabled={pendingCount === 0}
            onClick={handleStartProcessing}
          >
            开始处理{pendingCount > 0 ? `（${pendingCount} 行）` : ""}
          </Button>
          {processing ? (
            <Button danger disabled={stopping} onClick={stopProcessing}>
              {stopping ? "正在停止…" : "停止"}
            </Button>
          ) : null}
          <Button disabled={!hasData || processing} onClick={clear}>
            清空
          </Button>
          {fileName ? (
            <span className="yk-import-excel__file-name" title={fileName}>
              {fileName}
              {sheetName ? `（工作表：${sheetName}）` : ""}
            </span>
          ) : null}

          {hasData ? (
            <div className="yk-import-excel__stats">
              <span className="yk-import-excel__stat">共 {rows.length} 行</span>
              <span className="yk-import-excel__stat">已选 {selectedCount}</span>
              <span className="yk-import-excel__stat yk-import-excel__stat--danger">
                校验失败 {invalidCount}
              </span>
            </div>
          ) : null}
        </div>

        {/* 处理进度条：仅处理中展示，处理完成（成功/失败落定）即隐藏 */}
        {processing ? (
          <div className="yk-import-excel__progress">
            <Progress
              className="yk-import-excel__progress-bar"
              percent={progressPercent}
              status="active"
              format={() => `${progressDone}/${processingTotal}`}
            />
            <span className="yk-import-excel__progress-meta">
              成功 {progressSuccess}
              <span className="yk-import-excel__danger-text">
                {" "}/ 失败 {progressFailed}
              </span>
            </span>
            <span className="yk-import-excel__progress-eta">{etaText}</span>
          </div>
        ) : null}

        <div ref={bodyRef} className="yk-import-excel__body">
          <Spin spinning={loading} wrapperClassName="yk-import-excel__loading">
            {hasData ? (
              <Table<ImportRow>
                className="yk-import-excel__table"
                rowKey="rowNumber"
                columns={tableColumns}
                dataSource={rows}
                bordered
                size="small"
                pagination={false}
                rowSelection={rowSelection}
                scroll={{ x: "max-content", y: scrollY }}
                rowClassName={(_row, index) =>
                  index % 2 === 1 ? "yk-import-excel__row-alt" : ""
                }
              />
            ) : (
              <div className="yk-import-excel__empty" onClick={openFilePicker}>
                <svg
                  className="yk-import-excel__empty-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-6" />
                  <polyline points="9.5 14.5 12 12l2.5 2.5" />
                </svg>
                <p className="yk-import-excel__empty-title">
                  点击选择 Excel 文件，或将文件拖拽到此处
                </p>
                <p className="yk-import-excel__empty-hint">
                  支持 {accept} 格式，首行需为表头
                </p>
              </div>
            )}
          </Spin>
        </div>

        {/* 文件拖入时的全屏遮罩提示（pointer-events:none，drop 仍落到根节点） */}
        {isDragging ? (
          <div className="yk-import-excel__drop-mask">
            <div className="yk-import-excel__drop-tip">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 15V3" />
                <polyline points="7 8 12 3 17 8" />
                <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
              </svg>
              <span>松开鼠标，加载 Excel 文件</span>
            </div>
          </div>
        ) : null}

        {/* 失败行编辑（独立子组件）：保存时按列定义重新转换/校验，通过后翻为待处理并勾选 */}
        <ImportRowEditDialog
          open={editOpen}
          row={editingRow}
          columns={columns}
          saver={saveRowEdit}
          onClose={() => setEditOpen(false)}
          onSaved={onRowSaved}
        />
      </div>
    );
  },
);
