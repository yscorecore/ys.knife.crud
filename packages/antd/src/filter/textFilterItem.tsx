import { forwardRef, useImperativeHandle, useMemo } from "react";
import { Input } from "antd";
import type { FilterItemApi } from "@ys-knife-crud/core";
import type { Operator } from "@ys-knife-crud/core";
import { useTextFilterItem } from "@ys-knife-crud/react";
import { YsFilterItemLayout } from "./filterItemLayout";
import "./textFilterItem.css";

export interface TextFilterItemProps {
  /** 显示标签（渲染在控件上方） */
  label: string;
  /** 运算符；常传 Operator.Contains，也可传 Equals/StartsWith/EndsWith 等 */
  op: Operator;
  /** 实体属性路径（FilterInfo.left），如 "name" / "user.name" */
  propertyPath: string;
  /** 初始值；缺省为空字符串 */
  defaultValue?: string;
  /** 占位文本 */
  placeholder?: string;
}

/**
 * YsTextFilterItem：文本（string）单字段查询条件控件。
 * 只负责 string 类型，渲染 antd Input（可清空）。
 */
export const YsTextFilterItem = forwardRef<FilterItemApi, TextFilterItemProps>(
  function YsTextFilterItem(props, ref) {
    const { value, setValue, filter, reset } = useTextFilterItem(props);

    const api = useMemo<FilterItemApi>(
      () => ({
        get filter() {
          return filter;
        },
        reset,
      }),
      [filter, reset],
    );

    useImperativeHandle(ref, () => api, [api]);

    return (
      <YsFilterItemLayout label={props.label} api={api}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={props.placeholder}
          allowClear
        />
      </YsFilterItemLayout>
    );
  },
);
