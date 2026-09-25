<script setup lang="ts">
import { ref } from "vue";
import type { Column, DataColumn, ImportProcessSummary, ImportRowProcessor } from "@ys.knife.crud/core";
import { YsImportExcel } from "@ys.knife.crud/element-plus";
import { createExcelJsImportParser } from "@ys.knife.crud/import-exceljs";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";

defineEmits<{
  (e: "back"): void;
}>();

/**
 * 列定位演示：
 * - code/name/price/remark 走表头别名匹配（alias）
 * - qty 直接用 position=2（0-based，即第 3 列「数量」），即使表头改名也能取到
 * - remark 为可选列；其余为必需列（空值自动记校验失败）
 */
const columns: DataColumn[] = [
  { name: "code", alias: ["商品编码", "编码"] },
  { name: "name", alias: ["商品名称", "名称"] },
  {
    position: 2,
    name: "qty",
    valueMapper: (v) => Number(v),
    validator: (v) => {
      if (!Number.isFinite(v)) return ["数量必须是数字"];
      if (v <= 0) return ["数量必须大于 0"];
      return [];
    },
  },
  {
    name: "price",
    alias: ["单价", "价格", "价格(元)"],
    valueMapper: (v) => Number(v),
    validator: (v) => {
      if (!Number.isFinite(v)) return ["单价必须是数字"];
      if (v < 0) return ["单价不能为负数"];
      return [];
    },
  },
  { name: "remark", alias: ["备注"], optional: true },
];

/** ExcelJS 解析器（组件本身不绑定解析库，由外部注入） */
const parser = createExcelJsImportParser();

/** 模拟逐行调接口：随机耗时；编码以 E 开头的行抛错模拟处理失败 */
const processor: ImportRowProcessor = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 400));
  if (String(data.code).startsWith("E")) {
    throw new Error(`编码 ${data.code} 已存在，请更换后重试`);
  }
};

const lastSummary = ref<ImportProcessSummary | null>(null);

/** 一组可下载的测试数据 */
interface SampleDataset {
  key: string;
  /** 菜单项主标题 */
  label: string;
  /** 菜单项副标题（说明这组数据覆盖什么场景） */
  description: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: unknown[][];
}

/** 标准 5 列表头 */
const STANDARD_HEADERS = ["商品编码", "商品名称", "数量", "单价", "备注"];
/** 商品名素材（生成大批量数据用） */
const PRODUCT_NAMES = [
  "无线鼠标", "机械键盘", "USB-C 数据线", "4K 显示器", "笔记本支架",
  "静音键盘膜", "无线充电器", "蓝牙音箱", "网线 2m", "摄像头 1080P",
  "护眼台灯", "移动硬盘 1T", "人体工学椅", "桌面收纳盒", "显示器挂灯",
];

/** 生成 n 行全部合法的数据（编码 P1001 起，单价带一位小数，部分行无备注） */
function buildValidRows(n: number, startCode = 1001): unknown[][] {
  const rows: unknown[][] = [];
  for (let i = 0; i < n; i++) {
    const code = `P${startCode + i}`;
    const name = PRODUCT_NAMES[i % PRODUCT_NAMES.length]!;
    const qty = (i % 20) + 1;
    const price = Number((9.9 + (i % 50) * 7.5).toFixed(1));
    // 每 3 行留空备注，顺便验证可选列空值
    const remark = i % 3 === 0 ? "" : `批次 ${Math.floor(i / 10) + 1}`;
    rows.push([code, name, qty, price, remark]);
  }
  return rows;
}

/** 可下载的测试数据集合（下拉菜单数据源） */
const sampleDatasets: SampleDataset[] = [
  {
    key: "valid",
    label: "标准数据（全部校验通过）",
    description: "10 行合法数据，标准表头，处理应全部成功",
    fileName: "商品导入-标准数据.xlsx",
    sheetName: "商品导入",
    headers: STANDARD_HEADERS,
    rows: buildValidRows(10, 1),
  },
  {
    key: "invalid",
    label: "异常数据（校验失败 + 处理失败）",
    description: "14 行，含 3 行校验失败（禁选）与 1 行业务处理失败",
    fileName: "商品导入-异常数据.xlsx",
    sheetName: "商品导入",
    headers: STANDARD_HEADERS,
    rows: [
      ["P001", "无线鼠标", 12, 59.9, "办公款"],
      ["P002", "机械键盘", 8, 199, ""],
      ["E001", "模拟冲突商品", 3, 25, "编码以 E 开头 → 处理失败"],
      ["P004", "", 5, 12, "名称为空 → 校验失败"],
      ["P005", "USB-C 数据线", 0, 19.9, "数量为 0 → 校验失败"],
      ["P006", "笔记本支架", 6, "abc", "单价非数字 → 校验失败"],
      ["P007", "4K 显示器", 2, 1299, ""],
      ["P008", "静音键盘膜", 30, 9.9, "配件"],
      ["P009", "无线充电器", 15, 49, ""],
      ["P010", "蓝牙音箱", 7, 89, ""],
      ["P011", "网线 2m", 50, 8.5, ""],
      ["P012", "摄像头 1080P", 4, 159, ""],
      ["P013", "护眼台灯", 9, 129, ""],
      ["P014", "移动硬盘 1T", 3, 369, ""],
    ],
  },
  {
    key: "alias",
    label: "别名表头（alias 匹配 + 缺可选列）",
    description: "表头为「编码/名称/价格(元)」且无备注列，验证 name/alias 定位",
    fileName: "商品导入-别名表头.xlsx",
    sheetName: "商品导入",
    // 4 列：编码/名称 走 alias，价格(元) 走 alias；备注列整体缺失（optional 放行）
    headers: ["编码", "名称", "数量", "价格(元)"],
    rows: [
      ["A001", "无线鼠标", 12, 59.9],
      ["A002", "机械键盘", 8, 199],
      ["A003", "4K 显示器", 2, 1299],
      ["A004", "蓝牙音箱", 7, 89],
      ["A005", "护眼台灯", 9, 129],
      ["A006", "移动硬盘 1T", 3, 369],
    ],
  },
  {
    key: "reordered",
    label: "列顺序打乱（position 定位演示）",
    description: "列序为 编码/单价/数量/备注/名称，验证 position=2 与列序无关",
    fileName: "商品导入-列顺序打乱.xlsx",
    sheetName: "商品导入",
    // 行内值顺序与表头一致：code, price, qty, remark, name
    // qty 靠 position=2 取到第 3 列；name 靠表头名匹配到最后一列
    headers: ["商品编码", "单价", "数量", "备注", "商品名称"],
    rows: [
      ["R001", 59.9, 12, "办公款", "无线鼠标"],
      ["R002", 199, 8, "", "机械键盘"],
      ["R003", 1299, 2, "大屏", "4K 显示器"],
      ["R004", 89, 7, "", "蓝牙音箱"],
      ["R005", 8.5, 50, "线材", "网线 2m"],
      ["R006", 369, 3, "", "移动硬盘 1T"],
    ],
  },
  {
    key: "big",
    label: "大批量数据（200 行，全部合法）",
    description: "验证长列表一次性渲染与滚动（处理 200 行较久，可先取消部分勾选）",
    fileName: "商品导入-大批量200行.xlsx",
    sheetName: "商品导入",
    headers: STANDARD_HEADERS,
    rows: buildValidRows(200, 2001),
  },
];

/** 用导出 API 生成指定测试数据的 xlsx（消费已有的 @ys.knife.crud/export-exceljs） */
async function downloadDataset(key: string): Promise<void> {
  const dataset = sampleDatasets.find((d) => d.key === key);
  if (!dataset) return;
  const api = createExcelJsExportApiFunc()();
  // 导出只用到 displayName 写表头，propertyPath 填占位即可
  const headerColumns: Column[] = dataset.headers.map((displayName) => ({
    propertyPath: "",
    displayName,
  }));
  await api.renderHeader({ [dataset.sheetName]: headerColumns });
  await api.renderRows(dataset.sheetName, dataset.rows);
  await api.download(dataset.fileName);
}
</script>

<template>
  <div class="import-page">
    <header class="import-page__head">
      <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
      <div class="import-page__title-row">
        <h1>Excel 数据导入（YsImportExcel）</h1>
        <el-dropdown trigger="click" @command="downloadDataset">
          <el-button size="small" type="primary" plain>
            下载测试数据
            <svg class="import-page__caret" viewBox="0 0 1024 1024" width="12" height="12">
              <path d="M512 672L256 416h512z" fill="currentColor" />
            </svg>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="ds in sampleDatasets"
                :key="ds.key"
                :command="ds.key"
                class="import-page__sample-item"
              >
                <div class="import-page__sample-label">📥 {{ ds.label }}</div>
                <div class="import-page__sample-desc">{{ ds.description }}</div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <p class="import-page__hint">
        点击「选择 Excel 文件」手动选 xlsx → 按 <code>position → name → alias</code> 优先级映射列并逐行校验
        → 表格一次性展示全部行（行号 + checkbox + 末尾状态列，校验失败行不可勾选）
        → 「开始处理」串行调用外部 processor 逐行处理，状态实时翻转为 处理中/成功/失败。
        右上角可下载多组测试数据：标准数据、异常数据（含校验/处理失败）、别名表头、列顺序打乱、200 行大批量。
        校验失败或处理失败的行可在右侧「操作」列<strong>编辑</strong>（保存后自动重新校验，通过即翻为待处理并勾选，可再次提交）或<strong>删除</strong>。
      </p>
    </header>

    <el-alert
      v-if="lastSummary"
      class="import-page__alert"
      :title="`上一轮处理完成：共 ${lastSummary.total} 行，成功 ${lastSummary.success} 行，失败 ${lastSummary.failed} 行`"
      :type="lastSummary.failed === 0 ? 'success' : 'warning'"
      :closable="false"
      show-icon
    />

    <div class="import-page__body">
      <ys-import-excel :columns="columns" :parser="parser" :processor="processor"
        @processed="lastSummary = $event" />
    </div>
  </div>
</template>

<style scoped>
.import-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  box-sizing: border-box;
}

.import-page__head {
  flex-shrink: 0;
}

.import-page__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0;
}

.import-page__title-row h1 {
  margin: 0;
  font-size: 18px;
}

.import-page__hint {
  margin: 0 0 12px;
  color: #666;
  font-size: 0.92em;
  line-height: 1.6;
}

.import-page__alert {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.import-page__body {
  flex: 1;
  min-height: 0;
}

.import-page__caret {
  margin-left: 4px;
  vertical-align: -2px;
}

/* 下拉菜单项：主标题 + 灰色说明两行排布，撑出统一宽度避免长短不一 */
.import-page__sample-item {
  display: block;
  min-width: 300px;
  padding: 6px 12px;
  line-height: 1.5;
}

.import-page__sample-label {
  font-size: 13px;
  color: #303133;
}

.import-page__sample-desc {
  font-size: 12px;
  color: #909399;
  white-space: normal;
}

code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
