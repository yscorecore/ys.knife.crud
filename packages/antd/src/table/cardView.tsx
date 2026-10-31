import { Checkbox, Empty } from "antd";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import "./cardView.css";

/** 卡片视图 props：与 element-plus 版 cardView 语义一致，checkbox 状态由父组件受控 */
export interface YsCardViewProps {
  rows: Record<string, unknown>[];
  rowKey: string;
  showCheckbox: boolean;
  loading: boolean;
  hasActions: boolean;
  isSelected: (row: Record<string, unknown>) => boolean;
  onCheck: (row: Record<string, unknown>, checked: boolean) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>, row: Record<string, unknown>) => void;
  /** 卡片内容渲染（对应 Vue 的 #card 插槽）；未提供时以 JSON 兜底 */
  card?: (row: Record<string, unknown>, index: number) => ReactNode;
  /** 空数据提示（对应 Vue 的 #empty 插槽）；未提供时用 antd Empty */
  empty?: ReactNode;
}

/**
 * 卡片视图：当前页每行一张卡片，网格自适应排列。
 * 加载遮罩不在此处——由父组件 Table 在 view-area 内统一渲染。
 */
export function YsCardView(props: YsCardViewProps) {
  const { rows, rowKey, showCheckbox, loading, hasActions, isSelected, onCheck, onContextMenu, card, empty } = props;

  return (
    <div className="yk-table__cards">
      {rows.map((row, index) => {
        const selected = showCheckbox && isSelected(row);
        return (
          <div
            key={String(row[rowKey])}
            className={`yk-table__card${selected ? " is-selected" : ""}${hasActions ? " has-actions" : ""}`}
            title={hasActions ? "右键查看行操作" : undefined}
            onContextMenu={(event) => onContextMenu(event, row)}
          >
            {showCheckbox ? (
              <Checkbox
                className="yk-table__card-checkbox"
                checked={selected}
                onChange={(event) => onCheck(row, event.target.checked)}
              />
            ) : null}
            {card ? card(row, index) : <pre className="yk-table__card-json">{JSON.stringify(row, null, 2)}</pre>}
          </div>
        );
      })}
      {!loading && rows.length === 0 ? (
        <>{empty ?? <Empty className="yk-table__cards-empty" description="暂无数据" />}</>
      ) : null}
    </div>
  );
}
