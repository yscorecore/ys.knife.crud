import { useState, type ReactNode } from "react";
import { Button } from "antd";
import type { TableAction, TableApi } from "@ys-knife-crud/core";
import { toButtonProps } from "../shared/button";
import { renderIcon } from "../shared/icon";
import { YsSelectionBar } from "../table/selectionBar";
import YsTableActionMenuButton from "./tableActionMenuButton";
import "./commandBar.css";

/**
 * YsCommandBar（React + antd）：数据驱动的表格级命令面板。
 *
 * 与行操作列对照：commandBar 渲染表级命令（TableAction，execute 只接收 table）；
 * 左侧命令按钮流式排列，children 对应 Vue 默认插槽；右侧恒居内置表格操作下拉
 * （margin-left:auto），可用 showActionMenuButton 关闭。
 *
 * 执行期间：当前命令按钮 loading，其余命令按钮 disabled，避免重复并发执行。
 */
export interface YsCommandBarProps {
  /** 表级命令列表，每条渲染为一个 antd Button */
  actions: TableAction[];
  /** 当前表格实例；允许 null（按钮照常渲染，点击被忽略） */
  table?: TableApi | null;
  /** 是否显示内置表格操作下拉按钮（默认 true 居右） */
  showActionMenuButton?: boolean;
  /** 追加在命令按钮之后的内容（对应 Vue 默认插槽） */
  children?: ReactNode;
}

export function YsCommandBar({
  actions,
  table = null,
  showActionMenuButton = true,
  children,
}: YsCommandBarProps) {
  /** 正在执行的命令 name；null 表示空闲 */
  const [running, setRunning] = useState<string | null>(null);

  async function handleActionClick(action: TableAction): Promise<void> {
    if (!table || running !== null) return;
    setRunning(action.name);
    try {
      await action.execute(table);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="yk-command-bar">
      <div className="yk-command-bar__actions">
        {actions.map((action) => (
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
        ))}
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
      {showActionMenuButton && table && (
        <YsTableActionMenuButton table={table} className="yk-command-bar__menu" />
      )}
    </div>
  );
}

export default YsCommandBar;
