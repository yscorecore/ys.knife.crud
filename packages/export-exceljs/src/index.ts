import ExcelJS from "exceljs";
import type { Column, ExportApi, ExportApiFunc } from "@ys.knife.crud/core";

/**
 * ExcelJS 版导出实现的可选参数（创建时确定，之后按 ExportApi 生命周期使用）。
 */
export interface ExcelJsExportOptions {
  /** 各 sheet 的 Excel 字符宽：key 为 renderHeader 的 sheet 标识，value 与该 sheet 表头列一一对应；
   *  缺省按列名长度估算 */
  columnWidths?: Record<string, number[]>;
}

/** Excel 工作表名约束：最长 31 字符，且不能含 \ / ? * [ ] : */
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sheet";
}

/**
 * 基于 ExcelJS 的 ExportApi 实现（支持多 sheet）：
 * renderHeader 按 key 建齐全部工作表并写表头；renderRows 每次调用立即 addRow
 * 进对应工作表（数据层面边读边写）；download 时 writeBuffer 一次成文件并触发浏览器下载。
 *
 * 寻址约定：renderRows 的 sheet 参数用 renderHeader 的**原始 key**，
 * 实现内部维护 key → Worksheet 映射；Excel 里显示的名字是 key 经非法字符清洗后的版本。
 *
 * 注意：ExcelJS 浏览器构建（dist/exceljs.min.js）不含 stream.xlsx.WorkbookWriter
 * （仅 Node 构建有），因此浏览器端只能用 Workbook + writeBuffer——
 * 行级增量写入保留，zip 仍整体在内存生成（浏览器下载本就要求 Blob 整体在内存）。
 *
 * 生命周期：renderHeader（建簿建齐 sheet 写表头）→ renderRows × N（追加数据行）
 * → download（成文件下载）或 cancel（丢弃工作簿）。
 */
class ExcelJsExportApi implements ExportApi {
  private workbook: ExcelJS.Workbook | null = null;
  /** renderHeader 原始 key → 工作表 */
  private sheets = new Map<string, ExcelJS.Worksheet>();

  constructor(private readonly options: ExcelJsExportOptions) {}

  /** 建工作簿，按 key 建齐全部工作表并写表头；列宽取 options.columnWidths，缺省按列名长度估算 */
  renderHeader(sheets: Record<string, Column[]>): Promise<void> {
    this.workbook = new ExcelJS.Workbook();
    this.sheets.clear();
    const usedNames = new Set<string>();
    for (const [key, columns] of Object.entries(sheets)) {
      // 清洗后可能撞名（如 "a/b" 与 "a:b"），追加序号去重，保证 ExcelJS 不因重名抛错
      let name = sanitizeSheetName(key);
      for (let i = 2; usedNames.has(name); i++) {
        name = `${sanitizeSheetName(key).slice(0, 28)}_${i}`;
      }
      usedNames.add(name);
      const sheet = this.workbook.addWorksheet(name);
      sheet.columns = columns.map((c, i) => ({
        width: this.options.columnWidths?.[key]?.[i] ?? Math.max(10, c.displayName.length * 2),
      }));
      sheet.addRow(columns.map((c) => c.displayName));
      this.sheets.set(key, sheet);
    }
    return Promise.resolve();
  }

  /** 追加数据行到指定 sheet：每次调用立即写入（调用方按页喂数据即实现边读边写） */
  renderRows(sheet: string, data: unknown[][]): Promise<void> {
    const ws = this.sheets.get(sheet);
    if (!ws) throw new Error(`ExcelJsExportApi: 未知 sheet "${sheet}"（renderHeader 未声明）`);
    for (const row of data) {
      ws.addRow(row);
    }
    return Promise.resolve();
  }

  /** 取消：丢弃工作簿，不产出文件 */
  cancel(): Promise<void> {
    this.workbook = null;
    this.sheets.clear();
    return Promise.resolve();
  }

  /** 收尾：writeBuffer 生成 xlsx 字节并触发浏览器下载 */
  async download(fileName: string): Promise<void> {
    const workbook = this.workbook;
    if (!workbook) throw new Error("ExcelJsExportApi: renderHeader 尚未调用或已 cancel");
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    // 下载完成后释放引用
    this.workbook = null;
    this.sheets.clear();
  }
}

/**
 * 创建 ExcelJS 版 exportApiFunc：每次调用返回一个全新的 ExportApi 实例
 * （一次导出对应一个实例，互不串状态）。
 *
 * 将来如需其它导出形态（CSV、服务端导出等），按同样的 ExportApiFunc 签名
 * 提供新工厂即可，Table 组件无需改动。
 */
export function createExcelJsExportApiFunc(options: ExcelJsExportOptions = {}): ExportApiFunc {
  return () => new ExcelJsExportApi(options);
}
