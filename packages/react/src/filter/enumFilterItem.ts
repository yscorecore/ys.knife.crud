import { useCallback, useMemo, useState } from "react";
import { filter as filterFn, con, Operator } from "ys.knife.query.js";
import type { FilterInfo, Operator as OperatorType } from "ys.knife.query.js";

/**
 * 枚举（enum）单字段查询条件逻辑：UI 库无关（与 Vue 版 useEnumFilterItem 对应）。
 *
 * 单选：使用声明方指定的 op；多选：1 项 → Equals，2+ 项 → In（自动派生）。
 */
export interface EnumFilterItemProps {
  /** 运算符；仅单选模式使用 */
  readonly op: OperatorType;
  /** 实体属性路径（FilterInfo.left） */
  readonly propertyPath: string;
  /** 初始值；单选为单值，多选为数组 */
  readonly defaultValue?: string | number | null | (string | number)[];
  /** 是否多选；默认 false */
  readonly multiple?: boolean;
}

/** 多选模式下的值类型 */
export type EnumMultiValue = (string | number)[];
/** 单选模式下的值类型 */
export type EnumSingleValue = string | number | null;

export interface EnumFilterItemState {
  value: EnumSingleValue | EnumMultiValue;
  setValue: (value: EnumSingleValue | EnumMultiValue) => void;
  filter: FilterInfo | null;
  reset: () => void;
}

function toSingleValue(v: unknown): EnumSingleValue {
  if (typeof v === "string" || typeof v === "number") return v;
  return null;
}

function toMultiValue(v: unknown): EnumMultiValue {
  if (Array.isArray(v)) {
    return v.filter(
      (item): item is string | number =>
        typeof item === "string" || typeof item === "number",
    );
  }
  return [];
}

export function useEnumFilterItem(props: EnumFilterItemProps): EnumFilterItemState {
  const isMultiple = props.multiple === true;
  const initial: EnumSingleValue | EnumMultiValue = isMultiple
    ? toMultiValue(props.defaultValue)
    : toSingleValue(props.defaultValue);
  const [value, setValue] = useState<EnumSingleValue | EnumMultiValue>(initial);

  const filter = useMemo<FilterInfo | null>(() => {
    const empty = isMultiple
      ? !Array.isArray(value) || value.length === 0
      : value == null || (typeof value === "string" && value.trim() === "");
    if (empty) return null;

    if (isMultiple) {
      const arr = value as EnumMultiValue;
      if (arr.length === 1) {
        const v = arr[0];
        if (v == null) return null;
        return filterFn(props.propertyPath, Operator.Equals, con(v));
      }
      return filterFn(
        props.propertyPath,
        Operator.In,
        con(arr as unknown as (string | null)[]),
      );
    }
    const v = value as EnumSingleValue;
    if (v == null) return null;
    return filterFn(props.propertyPath, props.op, con(v));
  }, [value, isMultiple, props.propertyPath, props.op]);

  const reset = useCallback((): void => setValue(initial), [initial]);

  return { value, setValue, filter, reset };
}
