import { useMemo, useRef, useState } from "react";
import { Button, message } from "antd";
import {
  constActions,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type RowActionsFunc,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { createBigRows, delayedPagedData, metaFun, type UserRow } from "../../shared/demoData";

export interface BigDataPageProps {
  onBack: () => void;
}

// 列设置持久化到 localStorage（各演示页用独立 key，互不覆盖）
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-antd-table-columns-big-data");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-antd-table-columns-big-data");

const exportorFunc = createExcelJsExportApiFunc();

export default function BigDataPage({ onBack }: BigDataPageProps) {
  // 数据在页面挂载时创建：删除 splice 后 Table reload 能看到最新数据，且不污染其他演示
  const [rows] = useState<UserRow[]>(() => createBigRows());
  // 10000 行 + 每次请求 50ms 延迟；返回真实 totalCount：Total 10000、500 页一次到位
  const dataFun = useMemo(() => delayedPagedData(rows, 50, true), [rows]);

  // ref 直接用 core 的输出契约 TableApi 类型化
  const tableRef = useRef<TableApi | null>(null);

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

  // 全功能行操作：查看（恒可见可用）、编辑（age>=20 才可用）、删除（id=1 受保护不显示）
  const rowActionsFunc = useMemo<RowActionsFunc<UserRow>>(
    () =>
      constActions<UserRow>(
        {
          name: "view",
          desc: "查看",
          execute: (item) => {
            message.info(`查看：${item.name}（${item.email}，${item.age} 岁）`);
            return Promise.resolve();
          },
        },
        {
          name: "edit",
          desc: "编辑",
          enable: (item) => item.age >= 20,
          execute: (item) => {
            message.info(`编辑：${item.name}`);
            return Promise.resolve();
          },
        },
        {
          name: "delete",
          desc: "删除",
          type: "danger",
          show: (item) => item.id !== 1,
          execute: (item, table) => {
            const i = rows.findIndex((r) => r.id === item.id);
            if (i >= 0) rows.splice(i, 1);
            message.success(`已删除：${item.name}`);
            // action 完成后调用 table.reload() 刷新当前页（总数与列表实时更新）
            table.reload();
            return Promise.resolve();
          },
        },
      ),
    [rows],
  );

  const toolbar = (
    <>
      <Button type="primary" onClick={showSelection}>
        查看选中
      </Button>
      <Button type="primary" ghost onClick={() => tableRef.current?.openConfigDialog()}>
        ⚙ 列设置
      </Button>
      <Button
        type="primary"
        style={{ background: "#52c41a" }}
        onClick={() => tableRef.current?.openExportDialog()}
      >
        ⬇ 导出 Excel
      </Button>
    </>
  );

  return (
    <DemoPageLayout
      title="大数据全功能表格（10000 行，显示总条数）"
      hint="10000 行数据 + 50ms 请求延迟，接口返回真实 totalCount：分页器直接显示精确的 Total 10000 与 500 个页码。全部功能开启——跨页勾选（翻页不丢，上方可「查看选中」）、行操作（查看恒可用；编辑在 age<20 时禁用；id=1 受保护不显示删除，删除后显式 reload，总数实时减少）、列设置（localStorage 持久化，上方「⚙ 列设置」按钮调 openConfigDialog 打开）、导出 Excel（上方「⬇ 导出 Excel」按钮调 openExportDialog；选中 / 当前页 / 所有；导出所有按 500 条/次流式拉取 20 次，进度条显示精确百分比、分母「已加载 N / 10000」，并按当前拉取速率实时显示「预计剩余约 X 秒」）。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={20}
        showCheckbox
        loadCustomConfigFun={loadCustomConfigFun}
        saveCustomConfigFun={saveCustomConfigFun}
        exportPageSize={500}
        exportorFunc={exportorFunc}
        rowActionsFunc={rowActionsFunc}
      />
    </DemoPageLayout>
  );
}
