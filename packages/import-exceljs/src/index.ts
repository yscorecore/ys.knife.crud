import ExcelJS from "exceljs";
import type { ImportParser, ImportSheet, ImportSheetRow } from "@ys.knife.crud/core";

/**
 * 基于 ExcelJS 的 ImportParser 实现（浏览器友好）：
 * 读取用户选择的 xlsx File，返回所有工作表的原始单元格矩阵，
 * 全空行剔除、保留每行真实 Excel 行号（row.number），中间空行不会造成行号错位。
 *
 * 单元格值归一化（ExcelJS 的值模型比「纯标量」复杂）：
 * - 富文本 { richText } → 拼接纯文本
 * - 超链接 { hyperlink, text } → 显示文本（无 text 回退链接地址）
 * - 公式 { formula, result } / 共享公式 { sharedFormula, result } → 递归取 result
 * - 错误值 { error } → 空串
 * - Date → "YYYY-MM-DD"（纯日期）或 "YYYY-MM-DD HH:mm:ss"（带时间）
 * - 其余（string/number/boolean/null）原样返回
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Date → 紧凑可读字符串；时分秒全为 0 时只返回日期部分 */
export function formatExcelDate(d: Date): string {
  const datePart = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    return datePart;
  }
  return `${datePart} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 把 ExcelJS 的单元格值归一化为标量（见文件头说明） */
function normalizeCellValue(value: unknown): unknown {
  if (value == null) return "";
  if (value instanceof Date) return formatExcelDate(value);
  if (typeof value !== "object") return value;

  const v = value as Record<string, unknown>;
  if (Array.isArray(v.richText)) {
    return v.richText.map((seg) => String((seg as { text?: unknown }).text ?? "")).join("");
  }
  if ("error" in v) return "";
  if ("result" in v) return normalizeCellValue(v.result);
  if ("hyperlink" in v) {
    return typeof v.text === "string" && v.text !== "" ? v.text : v.hyperlink;
  }
  if ("text" in v && typeof v.text === "string") return v.text;
  return value;
}

/**
 * 解析 xlsx File → ImportSheet[]。
 * 抛错场景：文件无法被 ExcelJS 识别、或工作簿中没有任何工作表。
 */
export async function parseExcelWorkbook(file: File): Promise<ImportSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: ImportSheet[] = [];
  workbook.eachSheet((worksheet) => {
    const rows: ImportSheetRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      // includeEmpty:false：只迭代有内容的单元格，按 colNumber 落位
      // （中间空列留下数组空洞，读取时按 undefined 处理）
      const values: unknown[] = [];
      let hasValue = false;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const normalized = normalizeCellValue(cell.value);
        values[colNumber - 1] = normalized;
        if (normalized !== "" && normalized != null) hasValue = true;
      });
      if (hasValue) {
        rows.push({ rowNumber: row.number, values });
      }
    });
    sheets.push({ name: worksheet.name, rows });
  });

  if (sheets.length === 0) {
    throw new Error("文件中没有可读取的工作表");
  }
  return sheets;
}

/**
 * 创建 ExcelJS 版导入解析器。
 * 用法：把返回值作为 parser 传给 YsImportExcel 组件。
 */
export function createExcelJsImportParser(): ImportParser {
  return parseExcelWorkbook;
}
