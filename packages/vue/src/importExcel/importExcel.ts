import { computed, nextTick, ref, type Ref } from "vue";
import type {
    DataColumn,
    ImportParser,
    ImportProcessSummary,
    ImportProcessor,
    ImportRow,
} from "@ys-knife-crud/core";

/** useImportExcel 入参（组件把 props 的相关字段以 Ref 形式传入，保持响应式追踪） */
export interface UseImportExcelOptions {
    /** 列定义（position → name → alias 定位） */
    columns: Ref<DataColumn[]>;
    /** 导入处理器（处理函数 + 批次大小；单行处理只是 batchSize=1 的特例） */
    processor: Ref<ImportProcessor | undefined>;
    /** Excel 文件解析器（如 @ys-knife-crud/import-exceljs 的 createExcelJsImportParser()） */
    parser: Ref<ImportParser | undefined>;
}

/** 表头归一化：去空白 + 小写，保证 name/alias 匹配对空格与大小写不敏感 */
function normalizeHeader(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

/** 单元格是否「空」：null/undefined 或纯空白字符串 */
function isEmptyValue(value: unknown): boolean {
    return value === undefined || value === null
        || (typeof value === "string" && value.trim() === "");
}

/** 一条列定义的解析结果：index=-1 表示表头中未找到（仅 optional 列允许） */
interface ResolvedColumn {
    column: DataColumn;
    index: number;
}

/**
 * 按 position → name → alias 的优先级，把每条 DataColumn 定位到表头下标。
 * 返回缺失的必需列（调用方据此中止加载并提示）。
 */
function resolveColumns(
    columns: DataColumn[],
    header: unknown[],
): { resolved: ResolvedColumn[]; missing: DataColumn[] } {
    // 表头文本 → 第一个出现的下标（同名表头取第一个）
    const headerIndex = new Map<string, number>();
    header.forEach((cell, i) => {
        const key = normalizeHeader(cell);
        if (key !== "" && !headerIndex.has(key)) {
            headerIndex.set(key, i);
        }
    });

    const missing: DataColumn[] = [];
    const resolved: ResolvedColumn[] = columns.map((column) => {
        // 1) position 优先：直接按下标取，不再看表头
        if (typeof column.position === "number") {
            return { column, index: column.position };
        }
        // 2) 表头同名
        const byName = headerIndex.get(normalizeHeader(column.name));
        if (byName !== undefined) {
            return { column, index: byName };
        }
        // 3) 表头别名（按 alias 声明顺序尝试）
        if (column.alias) {
            for (const alias of column.alias) {
                const byAlias = headerIndex.get(normalizeHeader(alias));
                if (byAlias !== undefined) {
                    return { column, index: byAlias };
                }
            }
        }
        // 未找到：optional 列放行（值恒为 undefined），必需列收集到 missing
        if (column.optional) {
            return { column, index: -1 };
        }
        missing.push(column);
        return { column, index: -1 };
    });

    return { resolved, missing };
}

/**
 * Excel 数据导入逻辑（框架无关）：
 * 文件解析 → 列映射/校验（valid/invalid）→ 勾选同步 →
 * 逐行业务处理（processing → success/failed，状态实时回写）。
 *
 * UI 层（如 YsImportExcel）只负责文件选择框、表格与状态标签渲染，
 * 解析库经 parser 注入、业务操作经 processor 注入，本函数不绑定任何第三方库。
 */
export function useImportExcel({ columns, processor, parser }: UseImportExcelOptions) {
    /** 已加载并映射的全部数据行 */
    const rows = ref<ImportRow[]>([]);
    /** 本次加载解析出的列下标（loadFile 时确定；编辑回写 raw 时复用） */
    let resolvedColumns: ResolvedColumn[] = [];
    const fileName = ref("");
    const sheetName = ref("");
    /** 解析文件中（读文件 + 解析工作簿） */
    const loading = ref(false);
    /** 逐行处理中 */
    const processing = ref(false);
    /** 已请求停止（当前批完成后生效） */
    const stopping = ref(false);
    /** 本轮处理的 AbortController（停止时 abort，传给 processor） */
    let processController: AbortController | null = null;
    /** 本轮处理的总行数（驱动进度文案/进度条） */
    const processingTotal = ref(0);
    /** 本轮已落定（成功+失败）的行数，仅统计当前这一轮，开始时清零 */
    const progressDone = ref(0);
    /** 本轮成功/失败计数（开始时清零，驱动进度条文案） */
    const progressSuccess = ref(0);
    const progressFailed = ref(0);

    const hasData = computed(() => rows.value.length > 0);
    const invalidCount = computed(() => rows.value.filter((r) => r.status === "invalid").length);
    const successCount = computed(() => rows.value.filter((r) => r.status === "success").length);
    const failedCount = computed(() => rows.value.filter((r) => r.status === "failed").length);
    const selectedCount = computed(() => rows.value.filter((r) => r.selected).length);
    /** 勾选且尚未成功（valid/failed）——点击「开始处理」时真正处理的行 */
    const pendingCount = computed(
        () => rows.value.filter(
            (r) => r.selected && (r.status === "valid" || r.status === "failed"),
        ).length,
    );
    /** 已完成本轮处理的行数（成功 + 失败） */
    const processedCount = computed(() => successCount.value + failedCount.value);

    /**
     * 一列输入值 → 结构化值 + 校验错误（加载文件与编辑保存共用同一套规则）。
     * inputs 以 DataColumn.name 为 key；空值仅在 optional=false 时记错误，
     * 且空值不走 valueMapper（避免 Number("") = 0 之类的误转换）。
     */
    function mapInputs(inputs: Record<string, unknown>): {
        data: Record<string, unknown>;
        errors: string[];
    } {
        const data: Record<string, unknown> = {};
        const errors: string[] = [];
        for (const { column } of resolvedColumns) {
            const raw = inputs[column.name];
            if (isEmptyValue(raw)) {
                data[column.name] = undefined;
                if (!column.optional) {
                    errors.push(`「${column.name}」不能为空`);
                }
                continue;
            }
            const value = column.valueMapper ? column.valueMapper(raw) : raw;
            data[column.name] = value;
            const validatorErrors = column.validator?.(value);
            if (validatorErrors && validatorErrors.length > 0) {
                errors.push(...validatorErrors);
            }
        }
        return { data, errors };
    }

    /**
     * 加载 Excel 文件：解析第一个工作表 → 列映射 + 逐行校验。
     * 成功后默认勾选全部 valid 行；失败（解析异常/空表/缺必需列）抛错，由 UI 层提示。
     */
    async function loadFile(file: File): Promise<ImportRow[]> {
        const parse = parser.value;
        if (!parse) {
            throw new Error("未提供 parser（Excel 解析器），无法加载文件");
        }

        loading.value = true;
        try {
            const sheets = await parse(file);
            const sheet = sheets[0];
            if (!sheet || sheet.rows.length === 0) {
                throw new Error("工作表为空：首行需为表头，第二行起为数据");
            }

            const headerRow = sheet.rows[0]!;
            const { resolved, missing } = resolveColumns(columns.value, headerRow.values);
            if (missing.length > 0) {
                throw new Error(
                    `表头缺少必需列：${missing.map((c) => `「${c.name}」`).join("、")}`,
                );
            }
            resolvedColumns = resolved;

            const mapped: ImportRow[] = [];
            // 首行为表头，数据从第二行开始
            for (const sheetRow of sheet.rows.slice(1)) {
                // 以列名为 key 组装输入（position/name/alias 的定位差异在这里收口）
                const inputs: Record<string, unknown> = {};
                for (const { column, index } of resolvedColumns) {
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

            rows.value = mapped;
            fileName.value = file.name;
            sheetName.value = sheet.name;
            processingTotal.value = 0;
            progressDone.value = 0;
            progressSuccess.value = 0;
            progressFailed.value = 0;
            return mapped;
        } finally {
            loading.value = false;
        }
    }

    /**
     * 同步勾选状态：UI 层的表格 selection-change 回传当前选中的行，
     * 据此回写每行 selected（invalid 行在表格侧已禁用勾选）。
     */
    function syncSelection(selectedRows: ImportRow[]): void {
        const selectedSet = new Set(selectedRows);
        for (const row of rows.value) {
            row.selected = selectedSet.has(row);
        }
    }

    /**
     * 分批处理所有「勾选且状态为 valid/failed」的行：
     * - 按 processor.batchSize（默认 1）分块，串行逐块调用 processor.process，块内行同时翻为 processing
     * - process 返回与输入等长同序的结果数组，按 results[i] 回写 rows[i] 的 success/failed 与失败原因
     * - 结果数组长度与输入不一致、或整批抛错：该批全部标记 failed，错误信息统一回显
     * - 已 success 的行跳过，failed 的行允许重新勾选后重试
     * - 处理中可 stopProcessing()：当前批照常落定，后续批次不再发起；
     *   未开始的行保持 valid/failed 与勾选状态，可再次「开始处理」续跑
     * 返回本轮汇总；没有可处理行或正在处理时返回 null。
     */
    async function startProcessing(): Promise<ImportProcessSummary | null> {
        if (processing.value) return null;
        const importer = processor.value;
        if (!importer) {
            throw new Error("未提供 processor（导入处理器）");
        }

        const targets = rows.value.filter(
            (r) => r.selected && (r.status === "valid" || r.status === "failed"),
        );
        if (targets.length === 0) return null;

        const batch = Math.max(1, Math.floor(importer.batchSize ?? 1));
        processController = new AbortController();
        const signal = processController.signal;

        processing.value = true;
        stopping.value = false;
        processingTotal.value = targets.length;
        progressDone.value = 0;
        progressSuccess.value = 0;
        progressFailed.value = 0;
        const summary: ImportProcessSummary = {
            total: targets.length,
            success: 0,
            failed: 0,
            stopped: false,
        };
        try {
            for (let i = 0; i < targets.length; i += batch) {
                // 批次边界检查停止标记：当前批不中断，剩余批次不再发起
                if (stopping.value) {
                    summary.stopped = true;
                    break;
                }
                const chunk = targets.slice(i, i + batch);
                for (const row of chunk) {
                    row.status = "processing";
                    row.message = undefined;
                }
                // 先让「处理中」状态渲染出来，再执行业务（多为异步接口）
                await nextTick();
                try {
                    const results = await importer.process(chunk, signal);
                    if (!Array.isArray(results) || results.length !== chunk.length) {
                        throw new Error(
                            `processor 返回结果数量（${Array.isArray(results) ? results.length : "非数组"}）`
                            + `与输入行数（${chunk.length}）不一致`,
                        );
                    }
                    // 结果与输入按下标一一对应，回写每行状态
                    chunk.forEach((row, j) => {
                        const result = results[j]!;
                        row.status = result.status === "failed" ? "failed" : "success";
                        row.message = result.status === "failed" ? result.message : undefined;
                    });
                } catch (e) {
                    // 整批抛错（含 signal abort、结果长度不符）：全部标记 failed，错误信息统一回显
                    const msg = e instanceof Error ? e.message : String(e);
                    for (const row of chunk) {
                        row.status = "failed";
                        row.message = msg;
                    }
                }
                // 汇总本批结果
                for (const row of chunk) {
                    if (row.status === "failed") {
                        summary.failed += 1;
                        progressFailed.value += 1;
                    } else {
                        summary.success += 1;
                        progressSuccess.value += 1;
                    }
                    progressDone.value += 1;
                }
            }
            return summary;
        } finally {
            processing.value = false;
            stopping.value = false;
            processController = null;
        }
    }

    /**
     * 停止当前处理：当前批照常完成（processor 收到 abort 可自行中断在途请求），
     * 后续批次不再发起；未开始的行保持 valid/failed 与勾选状态，可续跑。
     */
    function stopProcessing(): void {
        if (!processing.value || stopping.value) return;
        stopping.value = true;
        processController?.abort();
    }

    /**
     * 保存对一行的编辑（校验失败/处理失败的行修正后重新提交用）：
     * inputs 以 DataColumn.name 为 key，重新走 valueMapper + validator：
     * - 仍有错误：保持 invalid、取消勾选，错误信息回写到行上
     * - 全部通过：翻为 valid、自动勾选，清空旧错误/失败信息，可直接再次「开始处理」
     * 同步回写 raw（按加载时解析的列下标），保持数据模型一致。
     * 返回更新后的行及本次错误数组（UI 据此决定是否关闭编辑弹窗）。
     */
    function saveRowEdit(
        row: ImportRow,
        inputs: Record<string, unknown>,
    ): { row: ImportRow; errors: string[] } {
        const { data, errors } = mapInputs(inputs);
        row.data = data;
        for (const { column, index } of resolvedColumns) {
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
        return { row, errors };
    }

    /** 删除一行（用户放弃无法/不想修正的失败行）；勾选状态由 UI 的 selection-change 自然同步 */
    function removeRow(row: ImportRow): void {
        const index = rows.value.indexOf(row);
        if (index >= 0) {
            rows.value.splice(index, 1);
        }
    }

    /** 清空已加载的数据与状态 */
    function clear(): void {
        rows.value = [];
        resolvedColumns = [];
        fileName.value = "";
        sheetName.value = "";
        processingTotal.value = 0;
        progressDone.value = 0;
        progressSuccess.value = 0;
        progressFailed.value = 0;
    }

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
        processedCount,
        loadFile,
        syncSelection,
        saveRowEdit,
        removeRow,
        startProcessing,
        stopProcessing,
        clear,
    };
}
