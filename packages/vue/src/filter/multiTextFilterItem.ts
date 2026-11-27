import { computed, ref } from "vue";
import { FilterInfo, Operator, con, filter as filterFn } from "@ys-knife-crud/core";
import type { FilterInfo as FilterInfoType } from "@ys-knife-crud/core";

/**
 * 文本多字段模糊查询逻辑：UI 库无关（与 React 版 useMultiTextFilterItem 对应）。
 *
 * 场景：「请输入名称或代码」——一个输入框同时对多个字段做模糊匹配。
 * - 值为空（null/空串/纯空白）时 filterInfo 返回 null（表示「无查询条件」，panel 端跳过）
 * - 非空时为每个 propertyPath 生成 filter(path, op, con(value))，再用
 *   FilterInfo.createOr 组合成「任一字段命中」的语义
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

/** 空值判定：null/空串/纯空白都视为未填 */
function isEmpty(v: string): boolean {
  return v == null || v.trim() === "";
}

export function useMultiTextFilterItem(props: MultiTextFilterItemProps) {
  const initial = typeof props.defaultValue === "string" ? props.defaultValue : "";
  const value = ref<string>(initial);

  const filterInfo = computed<FilterInfoType | null>(() => {
    if (isEmpty(value.value)) return null;
    const paths = props.propertyPaths.filter((p) => !!p);
    if (paths.length === 0) return null;
    const op = props.op ?? Operator.Contains;
    const parts = paths.map((p) => filterFn(p, op, con(value.value)));
    // 单字段时无需包一层 OR，保持最简 FilterInfo（toString 也更可读）
    if (parts.length === 1) return parts[0] as unknown as FilterInfoType;
    return FilterInfo.createOr(
      ...(parts as unknown as FilterInfoType[]),
    ) as unknown as FilterInfoType;
  });

  function reset(): void {
    value.value = initial;
  }

  return { value, filter: filterInfo, reset };
}
