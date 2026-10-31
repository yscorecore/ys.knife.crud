import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button, message, Radio, Tag } from "antd";
import {
  constActions,
  constData,
  loadLocalStorageConfig,
  Operator,
  saveLocalStorageConfig,
  type Column,
  type EnumOption,
  type EnumOptionsSource,
  type TableApi,
  type ViewMode,
} from "@ys-knife-crud/core";
import {
  YsDateRangeFilterItem,
  YsEnumFilterItem,
  YsFilterPanel,
  YsTable,
  YsTextFilterItem,
  type SavedQuery,
  type YsSelectionBarContext,
} from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface SearchPanelPageProps {
  onBack: () => void;
}

// 表格数据：固定 25 行，不与搜索面板联动（仅展示样式）
const dataFun = constData(manyRows);

// 列设置持久化（独立 key）
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-antd-search-table-columns");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-antd-search-table-columns");

// 导出实现
const exportorFunc = createExcelJsExportApiFunc();

function loadStatusOptions(): Promise<EnumOption[]> {
  return Promise.resolve([
    { label: "在职", value: 1 },
    { label: "离职", value: 2 },
    { label: "试用", value: 3 },
  ]);
}

// 高级查询模式可用的字段
const advancedColumns: Column[] = [
  { propertyPath: "name", displayName: "姓名", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "email", displayName: "邮箱", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "age", displayName: "年龄", dataTypeName: "number", showForDisplay: true },
  { propertyPath: "createdAt", displayName: "创建时间", dataTypeName: "date", showForDisplay: true },
  { propertyPath: "status", displayName: "状态", dataTypeName: "string", showForDisplay: true },
];
const advancedOptionSources: Record<string, EnumOptionsSource> = { status: loadStatusOptions };

/* ---- 行操作（命令列）：查看恒可用；编辑 age>=20 可用；删除 id=1 受保护 ---- */
const rowActionsFunc = constActions<UserRow>(
  {
    name: "view",
    desc: "查看",
    async execute(item) {
      message.info(`查看：${item.name}（${item.email}，${item.age} 岁）`);
    },
  },
  {
    name: "edit",
    desc: "编辑",
    enable: (item) => item.age >= 20,
    async execute(item) {
      message.info(`编辑：${item.name}`);
    },
  },
  {
    name: "delete",
    desc: "删除",
    show: (item) => item.id !== 1,
    async execute(item) {
      message.success(`已删除：${item.name}`);
    },
  },
);

/* ---- 卡片 / 列表视图内容 ---- */
const cardAvatarStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "#1677ff",
  color: "#fff",
  fontSize: 18,
  lineHeight: "40px",
  textAlign: "center",
  flexShrink: 0,
};

const listAvatarStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#1677ff",
  color: "#fff",
  fontSize: 14,
  lineHeight: "32px",
  textAlign: "center",
  flexShrink: 0,
};

function renderCard(row: Record<string, unknown>): ReactNode {
  const user = row as unknown as UserRow;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 24 }}>
      <div style={cardAvatarStyle}>{user.name.slice(0, 1)}</div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
        <div
          style={{
            fontSize: 12,
            color: "#909399",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.email}
        </div>
        <div>
          <Tag color="blue" bordered={false}>
            {user.age} 岁
          </Tag>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#c0c4cc", flexShrink: 0 }}>#{user.id}</div>
    </div>
  );
}

function renderList(row: Record<string, unknown>): ReactNode {
  const user = row as unknown as UserRow;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <div style={listAvatarStyle}>{user.name.slice(0, 1)}</div>
      <span style={{ fontWeight: 600, fontSize: 14, flexShrink: 0 }}>{user.name}</span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12,
          color: "#909399",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {user.email}
      </span>
      <Tag color="blue" bordered={false}>
        {user.age} 岁
      </Tag>
      <span style={{ fontSize: 12, color: "#c0c4cc", flexShrink: 0 }}>#{user.id}</span>
    </div>
  );
}

/**
 * 左下角悬浮选中操作条：无选中时不渲染；贴表格容器底部左侧。
 * YsTable 无内置选中提示条，且 React 侧 selectedRows 只能命令式读取——
 * 选中计数改由 selectionBar 渲染函数的上下文驱动（每次选中变化都会重渲染）。
 * absolute 定位锚定到页面侧 position:relative 容器（.yk-table 自身无定位）。
 */
function renderSelectionBar(ctx: YsSelectionBarContext): ReactNode {
  const count = ctx.selectedRows.length;
  if (count === 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 8,
        bottom: 8,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 12px",
        background: "#ecf5ff",
        border: "1px solid #d9ecff",
        borderRadius: 4,
        fontSize: "0.92em",
        color: "#409eff",
        boxShadow: "0 2px 8px rgb(0 0 0 / 10%)",
      }}
    >
      <span>
        已选 <strong style={{ fontSize: "1.05em", margin: "0 2px" }}>{count}</strong> 项
      </span>
      <Button type="link" size="small" style={{ padding: 0 }} onClick={ctx.clearSelection}>
        清空
      </Button>
    </div>
  );
}

export default function SearchPanelPage({ onBack }: SearchPanelPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  // 视图模式由外部 radio 受控驱动
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // 快速查询标签（简单/高级共享，保存的预设点击直接触发查询）
  const [quickQueries, setQuickQueries] = useState<SavedQuery[]>([]);

  /** 查看跨页累计选中的行 */
  function showSelection(): void {
    const selected = (tableRef.current?.selectedRows ?? []) as UserRow[];
    if (selected.length === 0) {
      message.warning("尚未选中任何行");
      return;
    }
    message.success(
      `已选中 ${selected.length} 行：${selected.map((row) => row.name).join("、")}`,
    );
  }

  /* ---- 命令面板（全局操作） ---- */
  function onCreate(): void {
    message.success("新增（仅演示命令面板）");
  }
  function onBatchDelete(): void {
    const selected = (tableRef.current?.selectedRows ?? []) as UserRow[];
    if (selected.length === 0) {
      message.warning("请先勾选要删除的行");
      return;
    }
    message.success(
      `已删除选中的 ${selected.length} 行：${selected.map((row) => row.name).join("、")}`,
    );
  }
  function onRefresh(): void {
    tableRef.current?.reload();
    message.info("已刷新");
  }

  return (
    <DemoPageLayout
      title="搜索面板 + 全功能表格（简单/高级 + 快速查询）"
      hint="上方 YsFilterPanel 开启简单↔高级切换与快速查询标签：简单模式放常用条件（姓名 contains、状态 equals、创建时间 between），点「高级」可自定义任意字段与操作符并保存为预设，保存后在简单模式点标签即查。下方 YsTable 全开：跨页勾选（checkbox）、表格/卡片/列表三视图切换、列设置（localStorage 持久化）、导出 Excel（选中/当前页/所有），左下角悬浮选中条由 selectionBar 渲染函数自绘。筛选条件暂不驱动表格查询，仅观察整体样式。"
      onBack={onBack}
    >
      {/* 搜索面板：简单/高级切换 + 快速查询 */}
      <YsFilterPanel
        enableAdvancedFilter
        showQuickQuery
        quickQueries={quickQueries}
        onUpdateQuickQueries={setQuickQueries}
        advancedColumns={advancedColumns}
        advancedOptionSources={advancedOptionSources}
      >
        <YsTextFilterItem
          label="姓名"
          propertyPath="name"
          op={Operator.Contains}
          placeholder="输入姓名片段"
        />
        <YsEnumFilterItem
          label="状态"
          propertyPath="status"
          op={Operator.Equals}
          optionsSource={loadStatusOptions}
          placeholder="选择状态"
        />
        <YsDateRangeFilterItem
          label="创建时间"
          propertyPath="createdAt"
          startPlaceholder="开始日期"
          endPlaceholder="结束日期"
        />
      </YsFilterPanel>

      {/* 命令面板：左侧全局操作按钮，右侧视图切换 / 列设置 / 导出（全部为外部入口，经 TableApi 驱动） */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button type="primary" onClick={onCreate}>
            新增
          </Button>
          <Button danger onClick={onBatchDelete}>
            批量删除
          </Button>
          <Button onClick={showSelection}>查看选中</Button>
          <Button onClick={onRefresh}>刷新</Button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Radio.Group
            size="small"
            value={viewMode}
            optionType="button"
            buttonStyle="solid"
            onChange={(event) => setViewMode(event.target.value as ViewMode)}
          >
            <Radio.Button value="table">表格</Radio.Button>
            <Radio.Button value="card">卡片</Radio.Button>
            <Radio.Button value="list">列表</Radio.Button>
          </Radio.Group>
          <Button onClick={() => tableRef.current?.openConfigDialog()}>⚙ 列设置</Button>
          <Button
            type="primary"
            style={{ background: "#52c41a" }}
            onClick={() => tableRef.current?.openExportDialog()}
          >
            ⬇ 导出 Excel
          </Button>
        </div>
      </div>

      {/* 全功能表格（position:relative 供左下角选中操作条定位） */}
      <div style={{ position: "relative" }}>
        <YsTable
          ref={tableRef}
          metaFun={metaFun}
          dataFun={dataFun}
          viewMode={viewMode}
          onUpdateViewMode={setViewMode}
          pageSize={10}
          showCheckbox
          loadCustomConfigFun={loadCustomConfigFun}
          saveCustomConfigFun={saveCustomConfigFun}
          exportPageSize={100}
          exportorFunc={exportorFunc}
          rowActionsFunc={rowActionsFunc}
          card={renderCard}
          list={renderList}
          selectionBar={renderSelectionBar}
        />
      </div>
    </DemoPageLayout>
  );
}
