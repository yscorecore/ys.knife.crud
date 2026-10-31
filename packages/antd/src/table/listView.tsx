import { Checkbox, Empty } from "antd";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import "./listView.css";

/** 列表视图 props：与 element-plus 版 listView 语义一致，checkbox 状态由父组件受控 */
export interface YsListViewProps {
  rows: Record<string, unknown>[];
  rowKey: string;
  showCheckbox: boolean;
  loading: boolean;
  hasActions: boolean;
  isSelected: (row: Record<string, unknown>) => boolean;
  onCheck: (row: Record<string, unknown>, checked: boolean) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>, row: Record<string, unknown>) => void;
  /** 行内容渲染（对应 Vue 的 #list 插槽）；未提供时以 JSON 兜底 */
  list?: (row: Record<string, unknown>, index: number) => ReactNode;
  /** 空数据提示（对应 Vue 的 #empty 插槽）；未提供时用 antd Empty */
  empty?: ReactNode;
}

/**
 * 列表视图：一行一条数据、占满整行宽度。
 * 加载遮罩不在此处——由父组件 Table 在 view-area 内统一渲染。
 */
export function YsListView(props: YsListViewProps) {
  const { rows, rowKey, showCheckbox, loading, hasActions, isSelected, onCheck, onContextMenu, list, empty } = props;

  return (
    <div className="yk-table__list">
      {rows.map((row, index) => {
        const selected = showCheckbox && isSelected(row);
        return (
          <div
            key={String(row[rowKey])}
            className={`yk-table__list-item${selected ? " is-selected" : ""}${hasActions ? " has-actions" : ""}`}
            title={hasActions ? "右键查看行操作" : undefined}
            onContextMenu={(event) => onContextMenu(event, row)}
          >
            {showCheckbox ? (
              <Checkbox
                className="yk-table__list-item-checkbox"
                checked={selected}
                onChange={(event) => onCheck(row, event.target.checked)}
              />
            ) : null}
            <div className="yk-table__list-item-body">
              {list ? list(row, index) : <pre className="yk-table__list-item-json">{JSON.stringify(row, null, 2)}</pre>}
            </div>
          </div>
        );
      })}
      {!loading && rows.length === 0 ? (
        <>{empty ?? <Empty description="暂无数据" />}</>
      ) : null}
    </div>
  );
}
