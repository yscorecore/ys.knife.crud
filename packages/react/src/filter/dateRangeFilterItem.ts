import { useCallback, useMemo, useState } from "react";
import { filter as filterFn, con, Operator } from "ys.knife.query.js";
import type { FilterInfo } from "ys.knife.query.js";

/**
 * 日期范围（daterange）单字段查询条件逻辑：UI 库无关
 * （与 Vue 版 useDateRangeFilterItem 对应）。op 内部固定为 Between。
 */
export type DateRangeValue = [string, string] | null;

export interface DateRangeFilterItemProps {
  /** 实体属性路径（FilterInfo.left） */
  readonly propertyPath: string;
  /** 初始值；[start, end] 字符串数组，缺省为 null */
  readonly defaultValue?: [string, string];
}

export interface DateRangeFilterItemState {
  value: DateRangeValue;
  setValue: (value: DateRangeValue) => void;
  filter: FilterInfo | null;
  reset: () => void;
}

function toRange(v: [string, string] | undefined): DateRangeValue {
  if (v && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "string") {
    return [v[0], v[1]];
  }
  return null;
}

function isEmpty(v: DateRangeValue): boolean {
  return v == null || v.length !== 2 || !v[0] || !v[1];
}

export function useDateRangeFilterItem(props: DateRangeFilterItemProps): DateRangeFilterItemState {
  const initial = toRange(props.defaultValue);
  const [value, setValue] = useState<DateRangeValue>(initial);

  const filter = useMemo<FilterInfo | null>(() => {
    if (isEmpty(value)) return null;
    const [start, end] = value as [string, string];
    return filterFn(props.propertyPath, Operator.Between, con([start, end]));
  }, [value, props.propertyPath]);

  const reset = useCallback((): void => setValue(initial), [initial]);

  return { value, setValue, filter, reset };
}
