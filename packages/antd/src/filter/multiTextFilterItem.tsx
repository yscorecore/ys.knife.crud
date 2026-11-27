import { forwardRef, useImperativeHandle, useMemo } from "react";
import { Input } from "antd";
import type { FilterItemApi, Operator } from "@ys-knife-crud/core";
import { useMultiTextFilterItem } from "@ys-knife-crud/react";
import { YsFilterItemLayout } from "./filterItemLayout";
import "./textFilterItem.css";

export interface MultiTextFilterItemProps {
  /** 显示标签（渲染在控件上方） */
  label: string;
  /** 参与模糊查询的字段路径列表，任一命中即满足（OR），如 ["name", "code"] */
  propertyPaths: string[];
  /** 运算符，缺省 Operator.Contains */
  op?: Operator;
  /** 初始值；缺省为空字符串 */
  defaultValue?: string;
  /** 占位文本 */
  placeholder?: string;
}

/**
 * YsMultiTextFilterItem：一个输入框对多个字段做「任一命中」的模糊查询，
 * 生成 `name contains x OR code contains x`。控件为 antd Input（可清空）。
 */
export const YsMultiTextFilterItem = forwardRef<FilterItemApi, MultiTextFilterItemProps>(
  function YsMultiTextFilterItem(props, ref) {
    const { value, setValue, filter, reset } = useMultiTextFilterItem(props);

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
      <YsFilterItemLayout label={props.label} api={api} minWidth={240}>
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
