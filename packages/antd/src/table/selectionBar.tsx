import { Button } from "antd";
import "./selectionBar.css";

/**
 * 选中提示栏：显示当前已选行数，并提供全选/反选/清空操作。
 * 与 element-plus 版 selectionBar 语义一致：无选中（count <= 0）时不渲染。
 * - 全选 / 反选：仅作用于当前页行；
 * - 清空：清空全部选中（含其他页）。
 */
export interface YsSelectionBarProps {
  /** 当前选中的行数 */
  count: number;
  /** 选中当前页所有行 */
  onSelectAll: () => void;
  /** 反选当前页行 */
  onInvert: () => void;
  /** 清空全部选中（含其他页的选中） */
  onClear: () => void;
}

export function YsSelectionBar({ count, onSelectAll, onInvert, onClear }: YsSelectionBarProps) {
  if (count <= 0) return null;
  return (
    <div className="yk-table__selection-bar">
      <span className="yk-table__selection-bar__count">已选 {count} 项</span>
      <span className="yk-table__selection-bar__sep">|</span>
      <Button type="link" className="yk-table__selection-bar__btn" onClick={onSelectAll}>
        全选
      </Button>
      <Button type="link" className="yk-table__selection-bar__btn" onClick={onInvert}>
        反选
      </Button>
      <span className="yk-table__selection-bar__sep">|</span>
      <Button type="link" className="yk-table__selection-bar__btn" onClick={onClear}>
        清空
      </Button>
    </div>
  );
}
