import type { Column } from "./meta";

/**
 * ExportApi 是「导出实现」的抽象契约：Table 等组件只经此接口写文件，
 * 具体格式（ExcelJS / CSV / 服务端导出等）由 exportApiFunc 注入的实现决定。
 *
 * 生命周期（一次导出对应 exportApiFunc() 返回的一个全新实例）：
 *   renderHeader（一次性声明全部 sheet 及各自表头）
 *   → renderRows × N（向指定 sheet 追加数据行；调用方按页喂数据即边读边写）
 *   → download（成文件并触发下载）或 cancel（丢弃已写入内容，不产出文件）
 */
export interface ExportApi {
    /**
     * 声明本次导出的全部 sheet 并写入各自表头。
     * key 为 sheet 标识（后续 renderRows 用同一个 key 寻址），
     * value 为该 sheet 的列定义（表头文本取 Column.displayName）。
     */
    renderHeader(sheets: Record<string, Column[]>): Promise<void>
    /**
     * 向指定 sheet 追加数据行。
     * sheet 必须是 renderHeader 声明过的 key；
     * 每行数组的元素顺序须与该 sheet 表头列顺序严格一致（所见即所得由调用方保证）。
     */
    renderRows(sheet: string, data: unknown[][]): Promise<void>
    /** 取消导出：丢弃已写入的内容，不产出文件 */
    cancel(): Promise<void>
    /** 收尾：生成文件并以 fileName 触发下载 */
    download(fileName: string): Promise<void>
}

/** 导出实现工厂：每次调用返回一个全新 ExportApi 实例（一次导出对应一个实例，互不串状态） */
export type ExportApiFunc = () => ExportApi

/**
 * 控制台版 ExportApi（假导出）：不产出任何文件，
 * 把 renderHeader / renderRows / download / cancel 的调用打到 console。
 * 用作组件的缺省导出实现——未注入 exportApiFunc 时导出流程可完整走通，
 * 方便联调与演示；生产环境请注入真实实现（如 @ys.knife.crud/export-exceljs）。
 */
class ConsoleExportApi implements ExportApi {
    private readonly sheets = new Map<string, unknown[][]>()
    private finished = false

    constructor(private readonly name: string) {}

    private ensureActive(): void {
        if (this.finished) {
            throw new Error(`[${this.name}] ExportApi 实例已终结（download/cancel 之后不能再调用）`)
        }
    }

    async renderHeader(sheets: Record<string, Column[]>): Promise<void> {
        this.ensureActive()
        for (const [key, columns] of Object.entries(sheets)) {
            this.sheets.set(key, [])
            console.log(`[${this.name}] renderHeader sheet="${key}" columns=[${columns.map((c) => c.displayName).join(", ")}]`)
        }
    }

    async renderRows(sheet: string, data: unknown[][]): Promise<void> {
        this.ensureActive()
        const rows = this.sheets.get(sheet)
        if (!rows) {
            throw new Error(`[${this.name}] 未声明的 sheet "${sheet}"（renderHeader 中未提供）`)
        }
        rows.push(...data)
        console.log(`[${this.name}] renderRows sheet="${sheet}" +${data.length} 行（累计 ${rows.length} 行）`)
    }

    async cancel(): Promise<void> {
        this.ensureActive()
        this.finished = true
        const totalRows = [...this.sheets.values()].reduce((n, r) => n + r.length, 0)
        console.log(`[${this.name}] cancel：丢弃已写入的 ${totalRows} 行，不产出文件`)
    }

    async download(fileName: string): Promise<void> {
        this.ensureActive()
        this.finished = true
        const summary = [...this.sheets.entries()].map(([k, r]) => `${k}: ${r.length} 行`).join(", ")
        console.log(`[${this.name}] download "${fileName}"（假导出，未生成文件）sheets: ${summary}`)
    }
}

/**
 * 创建控制台版 exportApiFunc：每次调用返回一个全新的 ConsoleExportApi 实例。
 * @param name 日志前缀，默认 "ConsoleExportApi"
 */
export function createConsoleExportApiFunc(name = "ConsoleExportApi"): ExportApiFunc {
    return () => new ConsoleExportApi(name)
}
