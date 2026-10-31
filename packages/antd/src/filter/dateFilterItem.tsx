import { forwardRef, useImperativeHandle, useMemo } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import type { FilterItemApi, Operator } from "@ys-knife-crud/core";
import { useDateFilterItem } from "@ys-knife-crud/react";
import { YsFilterItemLayout } from "./filterItemLayout";
import "./dateFilterItem.css";

export interface DateFilterItemProps {
  /** 显示标签（渲染在控件上方） */
  label: string;
  /** 运算符；常传 Operator.Equals，也可传 GreaterThan / LessThan 等 */
  op: Operator;
  /** 实体属性路径（FilterInfo.left），如 "birthDate" / "user.createdAt" */
  propertyPath: string;
  /** 初始值；YYYY-MM-DD 格式字符串，缺省为空 */
  defaultValue?: string;
  /** 占位文本 */
  placeholder?: string;
  /** 日期格式化串，默认 'YYYY-MM-DD'（输出的 value 为字符串） */
  valueFormat?: string;
}

/**
 * YsDateFilterItem：日期单字段查询条件控件。
 * 只负责 date 类型，渲染 antd DatePicker；value 始终以字符串保存。
 */
export const YsDateFilterItem = forwardRef<FilterItemApi, DateFilterItemProps>(
  function YsDateFilterItem(props, ref) {
    const { value, setValue, filter, reset } = useDateFilterItem(props);
    const valueFormat = props.valueFormat ?? "YYYY-MM-DD";

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
        <DatePicker
          value={value ? dayjs(value) : null}
          format={valueFormat}
          onChange={(_date, dateString) =>
            setValue(typeof dateString === "string" ? dateString : "")
          }
          placeholder={props.placeholder}
          allowClear
        />
      </YsFilterItemLayout>
    );
  },
);
