import { useState } from "react";
import { message } from "antd";
import {
  type Column,
  type EnumOption,
  type EnumOptionsSource,
  Operator,
  constData,
  emptyFilter,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type TableAction,
  type TableApi,
} from "@ys-knife-crud/core";
import {
  type SavedQuery,
  YsFilterPanel,
  YsTextFilterItem,
  YsDateFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
  YsTable,
  YsCommandBar,
  type FilterPanelHandle,
} from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun } from "../../shared/demoData";

export interface SingleLineFilterPageProps {
  onBack: () => void;
}

function disabledDateFn(d: Date): boolean {
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  thirtyAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  return d < thirtyAgo || d > now;
}

/* ---- 简单模式 filter items 的异步数据源 ---- */
async function loadStatusOptions(): Promise<EnumOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { label: "Active", value: 1 },
    { label: "Inactive", value: 2 },
    { label: "Pending", value: 3 },
    { label: "Archived", value: 4 },
  ];
}

async function loadTagOptions(): Promise<EnumOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { label: "开发", value: "dev" },
    { label: "设计", value: "design" },
    { label: "产品", value: "pm" },
    { label: "测试", value: "qa" },
  ];
}

/* ---- 高级查询模式所需的 columns / optionSources ---- */
const advancedColumns: Column[] = [
  { propertyPath: "name", displayName: "姓名", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "email", displayName: "邮箱", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "age", displayName: "年龄", dataTypeName: "number", showForDisplay: true },
  {
    propertyPath: "createdAt",
    displayName: "创建时间",
    dataTypeName: "date",
    showForDisplay: true,
  },
  {
    propertyPath: "enabled",
    displayName: "是否启用",
    dataTypeName: "boolean",
    showForDisplay: true,
  },
  {
    propertyPath: "status",
    displayName: "状态",
    dataTypeName: "string",
    showForDisplay: true,
  },
];

const advancedOptionSources: Record<string, EnumOptionsSource> = {
  status: loadStatusOptions,
};

/* ---------------- 全功能表格 ---------------- */

/** 25 行数据 + pageSize=10 → 3 页，可演示跨页勾选与「导出所有」 */
const dataFun = constData(manyRows);

/** 列设置持久化（独立 localStorage key，与其它演示页互不覆盖） */
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-single-line-filter-table");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-single-line-filter-table");

/** 真实导出实现（ExcelJS），外部下拉按钮调 openExportDialog 后产出 xlsx */
const exportorFunc = createExcelJsExportApiFunc();

/** 演示用表级命令集合（与 SwitchableFilterPage 内联一致） */
const tableCommands: TableAction[] = [
  {
    name: "refresh",
    desc: "刷新",
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 12 21 4 13 4" />
        <polyline points="3 12 3 20 11 20" />
        <path d="M21 4l-7.2 7.2a4 4 0 0 1-5.6 0L3 8" />
      </svg>
    ),
    execute: async (table) => {
      table.reload();
      message.success("已刷新表格数据");
    },
  },
  {
    name: "viewSelected",
    desc: "查看选中",
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    execute: async (table) => {
      const n = table.selectedRows.length;
      if (n === 0) {
        message.warning("当前未选中任何行");
        return;
      }
      message.info(`当前已跨页选中 ${n} 行`);
    },
  },
  {
    name: "add",
    desc: "新增",
    type: "primary",
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    execute: async () => {
      message.info("测试命令：新增（演示入口）");
    },
  },
  {
    name: "batchDelete",
    desc: "批量删除",
    type: "danger",
    plain: true,
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
    execute: async (table) => {
      const n = table.selectedRows.length;
      if (n === 0) {
        message.warning("请先勾选要删除的行");
        return;
      }
      message.success(`测试命令：批量删除 ${n} 行（演示入口，未真实删除）`);
    },
  },
];

const codeStyle = {
  background: "#eef2f7",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: "0.9em",
} as const;

/**
 * 搜索面板单行模式：YsFilterPanel 开启 singleLine，简单模式默认折叠成一行；
 * 快速查询标签独立成第二行。下方表格与「搜索面板 + 全功能表格」demo 一致。
 */
export default function SingleLineFilterPage({ onBack }: SingleLineFilterPageProps) {
  /** panel ref：经 handle 拿 filter（FilterInfo）、reset、mode */
  const [panel, setPanel] = useState<FilterPanelHandle | null>(null);
  /** 表格实例：ref 回调写入 state，YsCommandBar 挂载后即可拿到非空 table */
  const [table, setTable] = useState<TableApi | null>(null);

  const [lastFilterString, setLastFilterString] = useState<string>("");

  /** 快速查询列表（受控，简单模式和高级模式共享）。
   *  本 demo 开启 singleLine：折叠态不显示「高级查询」按钮（展开态才显示），
   *  预置 3 个标签用于演示「单行模式下快速查询独立成行」的布局效果；
   *  展开后可点「高级查询」进入高级面板保存更多预设。
   *  filterInfo 用 emptyFilter() 占位（点击标签触发空查询，对 constData 表格无影响）。 */
  const [quickQueries, setQuickQueries] = useState<SavedQuery[]>([
    {
      id: "preset-active",
      name: "活跃用户",
      description: "状态 = Active",
      group: { id: "g-active", combinator: "and", children: [] },
      filterInfo: emptyFilter() as unknown as SavedQuery["filterInfo"],
    },
    {
      id: "preset-recent",
      name: "近7天新增",
      description: "创建时间 最近7天",
      group: { id: "g-recent", combinator: "and", children: [] },
      filterInfo: emptyFilter() as unknown as SavedQuery["filterInfo"],
    },
    {
      id: "preset-dev",
      name: "开发团队",
      description: "标签 = 开发",
      group: { id: "g-dev", combinator: "and", children: [] },
      filterInfo: emptyFilter() as unknown as SavedQuery["filterInfo"],
    },
  ]);

  return (
    <DemoPageLayout
      title="搜索面板单行模式（展开/折叠 + 全功能表格）"
      hint="YsFilterPanel 开启 singleLine：简单模式默认折叠成一行，搜索条件 + 查询/重置按钮挤在一行内，放不下的搜索条件整体隐藏（不清除已填值，仍参与查询）；快速查询标签独立成第二行。折叠态不显示「高级查询」按钮（极简），展开后恢复多行布局并显示「高级查询」入口。右上角展开按钮（双下箭头）点开恢复多行，再点折叠按钮（双上箭头）回到单行；hover 提示被隐藏的条件数。拖拽窗口宽度变化时自动重测隐藏数量。下方表格与「搜索面板 + 全功能表格」demo 完全一致（隐藏内置按钮 + 命令面板 + 流式选中提示条）。"
      onBack={onBack}
    >
      <YsFilterPanel
        ref={setPanel}
        singleLine
        enableAdvancedFilter
        showQuickQuery
        quickQueries={quickQueries}
        onUpdateQuickQueries={setQuickQueries}
        advancedColumns={advancedColumns}
        advancedOptionSources={advancedOptionSources}
        onSearch={(filter) =>
          setLastFilterString(filter.toString() || "(empty)")
        }
        onReset={() => setLastFilterString("")}
      >
        <YsTextFilterItem
          label="姓名（contains）"
          propertyPath="name"
          op={Operator.Contains}
          placeholder="输入姓名片段"
        />
        <YsTextFilterItem
          label="邮箱（endswith）"
          propertyPath="email"
          op={Operator.EndsWith}
          placeholder="输入邮箱后缀"
        />
        <YsDateFilterItem
          label="生日（equals）"
          propertyPath="birthDate"
          op={Operator.Equals}
          placeholder="选择生日"
        />
        <YsDateRangeFilterItem
          label="创建时间（between）"
          propertyPath="createdAt"
          startPlaceholder="开始日期"
          endPlaceholder="结束日期"
          disabledDate={disabledDateFn}
        />
        <YsEnumFilterItem
          label="状态（equals）"
          propertyPath="status"
          op={Operator.Equals}
          optionsSource={loadStatusOptions}
          placeholder="选择状态"
        />
        <YsEnumFilterItem
          label="标签（in，多选）"
          propertyPath="tags"
          op={Operator.In}
          optionsSource={loadTagOptions}
          placeholder="选择标签（可多选）"
          multiple
        />
      </YsFilterPanel>

      {/* 表格命令面板：YsCommandBar 数据驱动渲染表级命令（刷新/查看选中/新增/批量删除），
          内置选中提示条（table 有选中行时自动显示）+ 右侧表格操作下拉按钮 */}
      <YsCommandBar actions={tableCommands} table={table} />

      {/* 全功能表格：Table 不内置任何命令 UI，列设置/导出/视图切换/选择行/列宽拖动
          全部由上方 YsCommandBar 的操作下拉经 TableApi 驱动；
          checkbox 列初始开启、视图初始表格——两者均非受控，由 TableApi 切换 */}
      <YsTable
        ref={setTable}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        showCheckbox
        loadCustomConfigFun={loadCustomConfigFun}
        saveCustomConfigFun={saveCustomConfigFun}
        exportorFunc={exportorFunc}
        card={(row) => (
          <div>
            <div style={{ fontWeight: 600 }}>
              {String(row.name)}{" "}
              <span style={{ marginLeft: 4, color: "#909399", fontWeight: 400, fontSize: "0.85em" }}>
                #{String(row.id)}
              </span>
            </div>
            <div style={{ marginTop: 4, color: "#909399", fontSize: 12 }}>
              {String(row.email)} · {String(row.age)} 岁
            </div>
          </div>
        )}
        list={(row) => (
          <div>
            <span style={{ fontWeight: 600 }}>{String(row.name)}</span>{" "}
            <span style={{ marginTop: 4, color: "#909399", fontSize: 12 }}>
              {String(row.email)} · {String(row.age)} 岁 · #{String(row.id)}
            </span>
          </div>
        )}
      />

      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          background: "#f5f7fa",
          borderRadius: 4,
          fontSize: "0.92em",
        }}
      >
        <p style={{ margin: "4px 0", color: "#606266" }}>
          当前模式：<code style={codeStyle}>{panel?.mode ?? "simple"}</code>
        </p>
        <p style={{ margin: "4px 0", color: "#606266" }}>
          当前 FilterInfo.toString()：
          <code style={codeStyle}>{panel?.filter.toString() || "(empty)"}</code>
        </p>
        {lastFilterString ? (
          <p style={{ margin: "4px 0", color: "#606266" }}>
            上次查询时提交的 FilterInfo：<code style={codeStyle}>{lastFilterString}</code>
          </p>
        ) : null}
        {quickQueries.length > 0 ? (
          <p style={{ margin: "4px 0", color: "#606266" }}>
            已保存的快速查询（{quickQueries.length}）：
            <code style={codeStyle}>
              {quickQueries
                .map((q) => `${q.name}${q.description ? `(${q.description})` : ""}`)
                .join(", ")}
            </code>
          </p>
        ) : null}
      </div>
    </DemoPageLayout>
  );
}
