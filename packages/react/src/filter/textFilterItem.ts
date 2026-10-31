import { useCallback, useMemo, useState } from "react";
import { filter as filterFn, con } from "ys.knife.query.js";
import type { FilterInfo, Operator } from "ys.knife.query.js";

/**
 * 文本（string）单字段查询条件逻辑：UI 库无关（与 Vue 版 useTextFilterItem 对应）。
 */
export interface TextFilterItemProps {
  /** 运算符；常传 Operator.Contains，也可传 Equals/StartsWith/EndsWith 等 */
  readonly op: Operator;
  /** 实体属性路径（FilterInfo.left），如 "name" / "user.name" */
  readonly propertyPath: string;
  /** 初始值；缺省为空字符串 */
  readonly defaultValue?: string;
}

export interface TextFilterItemState {
  value: string;
  setValue: (value: string) => void;
  /** 值为空时返回 null（表示「无查询条件」） */
  filter: FilterInfo | null;
  reset: () => void;
}

function isEmpty(v: string): boolean {
  return v == null || v.trim() === "";
}

export function useTextFilterItem(props: TextFilterItemProps): TextFilterItemState {
  const initial = typeof props.defaultValue === "string" ? props.defaultValue : "";
  const [value, setValue] = useState<string>(initial);

  const filter = useMemo<FilterInfo | null>(
    () => (isEmpty(value) ? null : filterFn(props.propertyPath, props.op, con(value))),
    [value, props.propertyPath, props.op],
  );

  const reset = useCallback((): void => setValue(initial), [initial]);

  return { value, setValue, filter, reset };
}
