import { useCallback, useMemo, useState } from "react";
import { FilterInfo, Operator, con, filter as filterFn } from "ys.knife.query.js";
import type { FilterInfo as FilterInfoType } from "ys.knife.query.js";

/**
 * 文本多字段模糊查询逻辑：UI 库无关（与 Vue 版 useMultiTextFilterItem 对应）。
 *
 * 场景：「请输入名称或代码」——一个输入框同时对多个字段做模糊匹配。
 * - 值为空时 filter 返回 null（表示「无查询条件」）
 * - 非空时为每个 propertyPath 生成 filter(path, op, con(value))，
 *   再用 FilterInfo.createOr 组合成「任一字段命中」的语义
 * - op 缺省为 Operator.Contains
 */

export interface MultiTextFilterItemProps {
  /** 参与模糊查询的字段路径列表，任一命中即满足（OR），如 ["name", "code"] */
  readonly propertyPaths: readonly string[];
  /** 运算符，缺省 Operator.Contains */
  readonly op?: Operator;
  /** 初始值；缺省为空字符串 */
  readonly defaultValue?: string;
}

export interface MultiTextFilterItemState {
  value: string;
  setValue: (value: string) => void;
  /** 值为空时返回 null（表示「无查询条件」） */
  filter: FilterInfo | null;
  reset: () => void;
}

function isEmpty(v: string): boolean {
  return v == null || v.trim() === "";
}

export function useMultiTextFilterItem(
  props: MultiTextFilterItemProps,
): MultiTextFilterItemState {
  const initial = typeof props.defaultValue === "string" ? props.defaultValue : "";
  const [value, setValue] = useState<string>(initial);
  // propertyPaths 常以字面量数组传入，依赖其内容而非引用，避免每次渲染重算
  const pathsKey = props.propertyPaths.join("|");

  const filter = useMemo<FilterInfo | null>(() => {
    if (isEmpty(value)) return null;
    const paths = props.propertyPaths.filter((p) => !!p);
    if (paths.length === 0) return null;
    const op = props.op ?? Operator.Contains;
    const parts = paths.map((p) => filterFn(p, op, con(value)));
    if (parts.length === 1) return parts[0] as unknown as FilterInfo;
    return FilterInfo.createOr(...(parts as unknown as FilterInfo[])) as unknown as FilterInfo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathsKey, props.op]);

  const reset = useCallback((): void => setValue(initial), [initial]);

  return { value, setValue, filter, reset };
}
