import { Button } from "antd";
import type { ColumnType } from "antd/es/table";
import type { Action, TableApi } from "@ys-knife-crud/core";
import { isEnabled, visibleActions } from "@ys-knife-crud/react";
import { toButtonProps } from "../shared/button";
import { renderIcon } from "../shared/icon";
import "./rowActionsColumn.css";

/** 行操作单元格：按行过滤可见操作并渲染为 link 按钮 */
export interface YsRowActionsCellProps {
  actions: Action<unknown>[];
  table: TableApi;
  row: Record<string, unknown>;
}

export function YsRowActionsCell({ actions, table, row }: YsRowActionsCellProps) {
  return (
    <div className="yk-row-actions">
      {visibleActions(actions, row).map((action) => {
        const buttonProps = toButtonProps(action.type, true);
        return (
          <Button
            key={action.name}
            type="link"
            size="small"
            danger={buttonProps.danger}
            disabled={!isEnabled(action, row)}
            className="yk-row-action"
            onClick={() => void action.execute(row, table)}
          >
            {action.icon ? <span className="yk-row-action__icon">{renderIcon(action.icon)}</span> : null}
            {action.desc}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * 行操作列（antd Table 的 columns 项）：actions 为空时返回 null（不渲染该列）。
 * 操作列固定右侧，最小宽度按按钮数估算，防止 fit 布局把列压窄导致按钮换行。
 */
export interface RowActionsColumnOptions {
  actions: Action<unknown>[];
  table: TableApi;
}

export function rowActionsColumn({ actions, table }: RowActionsColumnOptions): ColumnType<Record<string, unknown>> | null {
  if (actions.length === 0) return null;
  const minWidth = actions.length * 34 + (actions.length - 1) * 12 + 30;
  return {
    key: "__actions",
    title: "操作",
    fixed: "right",
    width: minWidth,
    render: (_value: unknown, row: Record<string, unknown>) => (
      <YsRowActionsCell actions={actions} table={table} row={row} />
    ),
  };
}
