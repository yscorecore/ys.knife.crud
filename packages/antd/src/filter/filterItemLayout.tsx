import type { ReactNode } from "react";
import type { FilterItemApi } from "@ys-knife-crud/core";
import { useFilterItem } from "@ys-knife-crud/react";
import "./filterItemLayout.css";

export interface FilterItemLayoutProps {
  /** 显示标签（渲染在控件上方，小字号次级颜色） */
  label: string;
  /** 最小宽度（px），默认 200；daterange 等较宽控件可传 240 */
  minWidth?: number;
  /** FilterItem 的 API 对象；layout 挂载时注册到 panel，卸载时反注册 */
  api: FilterItemApi;
  children?: ReactNode;
}

/**
 * YsFilterItemLayout：FilterItem 的统一外壳组件。
 *
 * 各具体 FilterItem 只需组装稳定 api 对象并传入 label / minWidth，
 * 控件通过 children 注入；注册与反注册逻辑统一在这里完成。
 */
export function YsFilterItemLayout(props: FilterItemLayoutProps) {
  useFilterItem(props.api);

  const minWidth = props.minWidth ?? 200;

  return (
    <div className="yk-filter-item" style={{ minWidth: `${minWidth}px` }}>
      <label className="yk-filter-item__label">{props.label}</label>
      <div className="yk-filter-item__control">{props.children}</div>
    </div>
  );
}
