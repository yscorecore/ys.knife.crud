/**
 * Excel 数据导入契约（框架无关）。
 *
 * 典型流程：
 *   ImportParser（文件 → 原始工作表矩阵）
 *   → 按 DataColumn 把每行映射为结构化数据并校验（ImportRow.status = valid/invalid）
 *   → 用户勾选待处理行
 *   → ImportRowProcessor 逐行处理（processing → success/failed，状态实时回显）
 */

/**
 * 一条导入列定义：描述「结构化字段」如何对应到 Excel 中的某一列。
 *
 * 列定位优先级：position（列位置）→ name（表头同名）→ alias（表头别名）。
 */
export interface DataColumn {
    /** 结构化数据字段名（映射结果对象的 key，同时作为表格列标题） */
    name: string,
    /**
     * Excel 表头别名：表头文本不等于 name 时依次尝试匹配
     * （匹配前对两侧做 trim，且忽略大小写）
     */
    alias?: string[],
    /**
     * 列位置——从 0 开始的原始单元格数组下标（与 Excel 列序号相差 1）。
     * 配置后**优先于** name/alias 使用，直接按下标取值。
     */
    position?: number,
    /**
     * 是否可选：
     * - true：表头中找不到该列不报错（值恒为 undefined）；单元格允许为空
     * - false（默认）：表头中找不到该列则整个文件加载失败；单元格为空记一条校验错误
     */
    optional?: boolean,
    /** 原始单元格值 → 结构化值的转换函数（如字符串转数字/日期） */
    valueMapper?: (value: any) => any,
    /** 校验函数，接收转换后的值，返回错误信息数组；返回空数组（或 undefined）表示通过 */
    validator?: (value: any) => string[],
}

/** 行状态：校验状态（valid/invalid）与处理状态（processing/success/failed）合一 */
export type ImportRowStatus =
    | "valid"        // 校验通过，等待处理
    | "invalid"      // 校验未通过（不可勾选）
    | "processing"   // 正在处理
    | "success"      // 处理成功
    | "failed";      // 处理失败（可重新勾选后再次处理）

/**
 * 一行导入数据的完整状态。
 * T 为 data 的类型（默认任意结构化对象）。
 */
export interface ImportRow<T = Record<string, unknown>> {
    /** Excel 行号（1-based，含表头行，首条数据通常为 2） */
    rowNumber: number,
    /** 原始单元格值（按列下标） */
    raw: unknown[],
    /** 经列映射 + valueMapper 转换后的结构化数据 */
    data: T,
    /** 是否勾选（invalid 行恒为 false） */
    selected: boolean,
    status: ImportRowStatus,
    /** 校验错误信息（status=invalid 时非空） */
    errors: string[],
    /** 处理失败的错误原因（processor 抛出的 error.message） */
    message?: string,
}

/**
 * 逐行处理函数：对一行结构化数据执行业务操作（通常是调接口）。
 * - resolve：该行记为 success
 * - reject / 抛错：该行记为 failed，error.message 作为失败原因
 */
export type ImportRowProcessor<T = Record<string, unknown>> = (
    data: T,
    row: ImportRow<T>,
) => Promise<void>;

/** 解析后的一行原始数据（保留真实 Excel 行号，中间空行不会导致行号错位） */
export interface ImportSheetRow {
    /** Excel 行号（1-based） */
    rowNumber: number,
    /** 该行各单元格的原始值；空单元格为 null/undefined/'' */
    values: unknown[],
}

/** 解析后的一个工作表 */
export interface ImportSheet {
    /** 工作表名称 */
    name: string,
    /** 单元格行（全空行已剔除；约定第一行为表头行） */
    rows: ImportSheetRow[],
}

/**
 * Excel 文件解析器：把用户选择的 File 解析成若干工作表。
 * 组件默认使用第一个工作表。具体实现（ExcelJS / SheetJS / 服务端解析等）
 * 由消费方注入，组件不绑定任何解析库。
 */
export type ImportParser = (file: File) => Promise<ImportSheet[]>

/** 一次「开始处理」结束后的汇总结果 */
export interface ImportProcessSummary {
    /** 本轮处理的总行数 */
    total: number,
    success: number,
    failed: number,
}
