import { useCallback, useMemo, useState } from "react";
import { filter as filterFn, con } from "ys.knife.query.js";
import type { FilterInfo, Operator } from "ys.knife.query.js";

/**
 * 日期（date）单字段查询条件逻辑：UI 库无关（与 Vue 版 useDateFilterItem 对应）。
 * value 为 YYYY-MM-DD 字符串，composable 不处理 Date 对象。
 */
export interface DateFilterItemProps {
  /** 运算符；常传 Operator.Equals，也可传 GreaterThan / LessThan 等 */
  readonly op: Operator;
  /** 实体属性路径（FilterInfo.left） */
  readonly propertyPath: string;
  /** 初始值；YYYY-MM-DD 格式字符串，缺省为空 */
  readonly defaultValue?: string;
}

export interface DateFilterItemState {
  value: string;
  setValue: (value: string) => void;
  filter: FilterInfo | null;
  reset: () => void;
}

function isEmpty(v: string): boolean {
  return v == null || v.trim() === "";
}

export function useDateFilterItem(props: DateFilterItemProps): DateFilterItemState {
  const initial = typeof props.defaultValue === "string" ? props.defaultValue : "";
  const [value, setValue] = useState<string>(initial);

  const filter = useMemo<FilterInfo | null>(
    () => (isEmpty(value) ? null : filterFn(props.propertyPath, props.op, con(value))),
    [value, props.propertyPath, props.op],
  );

  const reset = useCallback((): void => setValue(initial), [initial]);

  return { value, setValue, filter, reset };
}
