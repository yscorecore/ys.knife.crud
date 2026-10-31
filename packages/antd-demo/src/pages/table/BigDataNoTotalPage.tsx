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

export interface BigDataNoTotalPageProps {
  onBack: () => void;
}

// 列设置持久化到 localStorage（各演示页用独立 key，互不覆盖）
const loadCustomConfigFun = loadLocalStorageConfig(
  "yk-crud-demo-antd-table-columns-big-data-no-total",
);
const saveCustomConfigFun = saveLocalStorageConfig(
  "yk-crud-demo-antd-table-columns-big-data-no-total",
);

const exportorFunc = createExcelJsExportApiFunc();

export default function BigDataNoTotalPage({ onBack }: BigDataNoTotalPageProps) {
  // 数据在页面挂载时创建：删除 splice 后 Table reload 能看到最新数据，且不污染其他演示
  const [rows] = useState<UserRow[]>(() => createBigRows());
  // 10000 行 + 每次请求 80ms 延迟；totalCount 返回 null，仅靠 hasNext 翻页——
  // Table 估算总数（第 1 页 21、第 2 页 41、第 3 页 61……），页码随翻页增长，末页收敛为 10000
  const dataFun = useMemo(() => delayedPagedData(rows, 80, false), [rows]);

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
            // action.execute 后组件不会自动 reload，显式刷新让估算总数与列表更新
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
      title="大数据全功能表格（10000 行，不返回总条数）"
      hint="同样是 10000 行全功能，但接口不返回 totalCount，只给 hasNext：分页器隐藏「共 N 条」，按「当前 offset + 本页条数 + 1」估算总数驱动页码——初始只有少量页码，往后翻逐步增长，直到最后一页才收敛为真实的 10000。勾选、行操作、列设置、导出与上一页完全一致（列设置 / 导出入口均在上方外部按钮）；导出所有时真实总数未知：进度文案只显示「已加载 N 条」不带分母、百分比滚到 99% 封顶、不显示预计剩余时间（靠 hasNext=false 正确终止）。"
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
