import { computed, nextTick, ref, type Ref } from "vue";
import type {
    DataColumn,
    ImportParser,
    ImportProcessSummary,
    ImportRow,
    ImportRowProcessor,
} from "@ys.knife.crud/core";

/** useImportExcel 入参（组件把 props 的相关字段以 Ref 形式传入，保持响应式追踪） */
export interface UseImportExcelOptions {
    /** 列定义（position → name → alias 定位） */
    columns: Ref<DataColumn[]>;
    /** 逐行处理函数 */
    processor: Ref<ImportRowProcessor | undefined>;
    /** Excel 文件解析器（如 @ys.knife.crud/import-exceljs 的 createExcelJsImportParser()） */
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
     * 逐行处理所有「勾选且状态为 valid/failed」的行：
     * - 串行执行 processor（一行处理完再处理下一行），状态实时翻转为 processing
     * - processor 正常结束 → success（返回字符串作为成功提示）；抛错 → failed（错误信息回显）
     * - 已 success 的行跳过，failed 的行允许重新勾选后重试
     * 返回本轮汇总；没有可处理行或正在处理时返回 null。
     */
    async function startProcessing(): Promise<ImportProcessSummary | null> {
        if (processing.value) return null;
        const processRow = processor.value;
        if (!processRow) {
            throw new Error("未提供 processor（逐行处理函数）");
        }

        const targets = rows.value.filter(
            (r) => r.selected && (r.status === "valid" || r.status === "failed"),
        );
        if (targets.length === 0) return null;

        processing.value = true;
        processingTotal.value = targets.length;
        progressDone.value = 0;
        progressSuccess.value = 0;
        progressFailed.value = 0;
        const summary: ImportProcessSummary = { total: targets.length, success: 0, failed: 0 };
        try {
            for (const row of targets) {
                row.status = "processing";
                row.message = undefined;
                // 先让「处理中」状态渲染出来，再执行业务（多为异步接口）
                await nextTick();
                try {
                    await processRow(row.data, row);
                    row.status = "success";
                    summary.success += 1;
                    progressSuccess.value += 1;
                } catch (e) {
                    row.status = "failed";
                    row.message = e instanceof Error ? e.message : String(e);
                    summary.failed += 1;
                    progressFailed.value += 1;
                }
                progressDone.value += 1;
            }
            return summary;
        } finally {
            processing.value = false;
        }
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
        clear,
    };
}
