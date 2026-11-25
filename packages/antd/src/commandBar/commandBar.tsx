import { useMemo, useState, type ReactNode } from "react";
import { Button } from "antd";
import type { TableAction, TableApi } from "@ys-knife-crud/core";
import { toButtonProps } from "../shared/button";
import { renderIcon } from "../shared/icon";
import { YsSelectionBar } from "../table/selectionBar";
import "./commandBar.css";

/**
 * YsCommandBar（React + antd）：数据驱动的表格级命令面板。
 *
 * 与行操作列对照：commandBar 渲染表级命令（TableAction，execute 只接收 table）。
 * 按 align 把 actions 拆成两组——align 非 right（默认）的命令在左侧流式排列，
 * 其后跟随内置 SelectionBar（table 有选中行时自动显示）与 children（对应 Vue 默认插槽）；
 * align === right 的命令推到面板最右端（margin-left:auto）。
 *
 * 内置表格操作下拉（刷新/导出/列设置/视图切换等）不再由 commandBar 自动渲染——
 * 需要时请作为 TableAction 自行加入（可设 align: 'right' 放到右侧），
 * 或在 children 中放置自定义按钮 / YsTableActionMenuButton。
 *
 * 执行期间：当前命令按钮 loading，其余命令按钮 disabled，避免重复并发执行。
 */
export interface YsCommandBarProps {
  /** 表级命令列表，每条渲染为一个 antd Button；align 控制左右分组 */
  actions: TableAction[];
  /** 当前表格实例；允许 null（按钮照常渲染，点击被忽略） */
  table?: TableApi | null;
  /** 追加在命令按钮之后的内容（对应 Vue 默认插槽） */
  children?: ReactNode;
}

export function YsCommandBar({ actions, table = null, children }: YsCommandBarProps) {
  /** 正在执行的命令 name；null 表示空闲 */
  const [running, setRunning] = useState<string | null>(null);

  /** 左侧命令组：align 非 right（含未设置） */
  const leftActions = useMemo(
    () => actions.filter((a) => a.align !== "right"),
    [actions],
  );
  /** 右侧命令组：align === right */
  const rightActions = useMemo(
    () => actions.filter((a) => a.align === "right"),
    [actions],
  );

  async function handleActionClick(action: TableAction): Promise<void> {
    if (!table || running !== null) return;
    setRunning(action.name);
    try {
      await action.execute(table);
    } finally {
      setRunning(null);
    }
  }

  function renderButton(action: TableAction) {
    return (
      <Button
        key={action.name}
        {...toButtonProps(action.type, action.plain)}
        icon={renderIcon(action.icon)}
        loading={running === action.name}
        disabled={running !== null && running !== action.name}
        onClick={() => void handleActionClick(action)}
      >
        {action.desc}
      </Button>
    );
  }

  return (
    <div className="yk-command-bar">
      <div className="yk-command-bar__actions">
        {leftActions.map(renderButton)}
        {/* 内置选中提示条：table 有选中行时自动显示（count>0 才渲染） */}
        {table && (
          <YsSelectionBar
            count={table.selectedRows.length}
            onSelectAll={() => table.selectAllOnPage()}
            onInvert={() => table.invertSelectionOnPage()}
            onClear={() => table.clearSelection()}
          />
        )}
        {children}
      </div>
      {rightActions.length > 0 && (
        <div className="yk-command-bar__right">{rightActions.map(renderButton)}</div>
      )}
    </div>
  );
}

export default YsCommandBar;
