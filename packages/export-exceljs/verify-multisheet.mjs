// 多 sheet roundtrip 验证：dist 产物 + 真实 exceljs（Node 主入口）
// 打桩浏览器下载三件套以捕获 Blob，再用 exceljs 读回校验
import ExcelJS from "exceljs";
import { createExcelJsExportApiFunc } from "./dist/index.js";

const col = (propertyPath, displayName) => ({
  propertyPath, displayName, description: null, showForDisplay: true,
  displayFormat: null, isArray: false, dataTypeName: "string", displayOrder: 0,
  dataSource: null, queryFilter: null,
});

let captured = null;
URL.createObjectURL = (b) => { captured = b; return "blob:mock"; };
URL.revokeObjectURL = () => {};
globalThis.document = { createElement: () => ({ click() {}, set download(_v) {}, set href(_v) {} }) };

const api = createExcelJsExportApiFunc({ columnWidths: { "用户/列表": [12, 20] } })();
await api.renderHeader({
  // key 故意含 Excel 非法字符 "/"，验证清洗；第二个 sheet 验证多 sheet 共存
  "用户/列表": [col("id", "ID"), col("name", "姓名")],
  "订单": [col("no", "单号")],
});
await api.renderRows("用户/列表", [[1, "Alice"], [2, "Bob"]]);
await api.renderRows("订单", [["A001"]]);
await api.renderRows("用户/列表", [[3, "Carol"]]);
await api.download("roundtrip.xlsx");

if (!captured) throw new Error("未捕获到下载 Blob");
const buf = await captured.arrayBuffer();
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(buf);

const names = wb.worksheets.map((w) => w.name);
const users = wb.getWorksheet(names[0]);
const orders = wb.getWorksheet(names[1]);
const usersRows = [];
users.eachRow((r) => usersRows.push(r.values.slice(1)));
const ordersRows = [];
orders.eachRow((r) => ordersRows.push(r.values.slice(1)));

const ok =
  names.length === 2 &&
  names[0] === "用户_列表" && // "/" 清洗为 "_"
  JSON.stringify(usersRows) === JSON.stringify([["ID", "姓名"], [1, "Alice"], [2, "Bob"], [3, "Carol"]]) &&
  JSON.stringify(ordersRows) === JSON.stringify([["单号"], ["A001"]]) &&
  users.getColumn(1).width === 12 && users.getColumn(2).width === 20;

console.log("sheet names:", JSON.stringify(names));
console.log("users rows:", JSON.stringify(usersRows));
console.log("orders rows:", JSON.stringify(ordersRows));
console.log("col widths:", users.getColumn(1).width, users.getColumn(2).width);

// 未知 sheet 应报错
let unknownSheetThrew = false;
try { await api.renderRows("不存在", [[1]]); } catch { unknownSheetThrew = true; }
// download 后再 download 应报错（实例已终结）
let reuseThrew = false;
try { await api.download("again.xlsx"); } catch { reuseThrew = true; }

console.log("unknown sheet threw:", unknownSheetThrew, "| reuse after download threw:", reuseThrew);
if (!ok || !unknownSheetThrew || !reuseThrew) { console.error("ROUNDTRIP FAILED"); process.exit(1); }
console.log("ROUNDTRIP OK");
