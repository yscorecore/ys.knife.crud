import { forwardRef, useImperativeHandle, useMemo } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { FilterItemApi } from "@ys-knife-crud/core";
import { useDateRangeFilterItem } from "@ys-knife-crud/react";
import { YsFilterItemLayout } from "./filterItemLayout";
import "./dateRangeFilterItem.css";

export interface DateRangeFilterItemProps {
  /** 显示标签（渲染在控件上方） */
  label: string;
  /** 实体属性路径（FilterInfo.left），如 "createdAt" / "user.registeredAt" */
  propertyPath: string;
  /** 初始值；[start, end] 字符串数组，缺省为 null */
  defaultValue?: [string, string];
  /** 起始日期占位文本 */
  startPlaceholder?: string;
  /** 结束日期占位文本 */
  endPlaceholder?: string;
  /** 日期格式化串，默认 'YYYY-MM-DD'（输出的 value 为字符串数组） */
  valueFormat?: string;
  /** 禁用日期函数，接收 Date 返回 boolean，true 表示禁用 */
  disabledDate?: (date: Date) => boolean;
}

/**
 * YsDateRangeFilterItem：日期范围单字段查询条件控件。
 * 渲染 antd DatePicker.RangePicker；op 内部固定为 Between。
 */
export const YsDateRangeFilterItem = forwardRef<FilterItemApi, DateRangeFilterItemProps>(
  function YsDateRangeFilterItem(props, ref) {
    const { value, setValue, filter, reset } = useDateRangeFilterItem({
      propertyPath: props.propertyPath,
      defaultValue: props.defaultValue,
    });
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

    const rangeValue: [Dayjs, Dayjs] | null =
      value && value.length === 2
        ? [dayjs(value[0]), dayjs(value[1])]
        : null;

    return (
      <YsFilterItemLayout label={props.label} api={api} minWidth={240}>
        <DatePicker.RangePicker
          value={rangeValue}
          format={valueFormat}
          onChange={(dates, dateStrings) => {
            if (!dates) {
              setValue(null);
            } else {
              setValue([dateStrings[0], dateStrings[1]]);
            }
          }}
          placeholder={[
            props.startPlaceholder ?? "开始日期",
            props.endPlaceholder ?? "结束日期",
          ]}
          disabledDate={
            props.disabledDate
              ? (current) => props.disabledDate?.(current.toDate()) ?? false
              : undefined
          }
          allowClear
        />
      </YsFilterItemLayout>
    );
  },
);
