import { computed, ref } from "vue";
import { filter, con } from "ys.knife.query.js";
import type { FilterInfo, Operator } from "ys.knife.query.js";

/**
 * 日期（date）单字段查询条件逻辑：UI 库无关。
 *
 * 设计原则：每个具体 FilterItem 组件（Text/Number/Date/DateRange/Bool...）只负责
 * 自己的一种类型，不在一个 composable 里实现 type 工厂模式。
 *
 * - value 为 string（YYYY-MM-DD 格式，由 UI 层 el-date-picker value-format 决定）；
 *   composable 不处理 Date 对象，统一以字符串形式构造 FilterInfo
 * - op 由声明方指定（常为 Equals，也可 GreaterThan/LessThan/GreaterThanOrEqual 等）
 * - 值为空（null/空串/纯空白）时 filterInfo 返回 null（panel 端聚合时跳过）
 * - 非空时 filterInfo 返回 filter(propertyPath, op, con(value))；
 *   con 把日期字符串包装成 Constant（ys.knife.query.js 的标准右值类型）
 *
 * 返回结构供 DateFilterItem.vue 组装成 FilterItemApi。
 */

/**
 * 日期 FilterItem 的 props 契约：composable 与 element-plus 组件共享。
 * 不含 label/placeholder 等 UI 字段（由 element-plus 组件自己声明）；
 * 不含 valueFormat（composable 只处理字符串，不关心 UI 层格式约束）。
 */
export interface DateFilterItemProps {
  /** 运算符；常传 Operator.Equals，也可传 GreaterThan / LessThan /
   *  GreaterThanOrEqual / LessThanOrEqual 等对日期有意义的 op */
  readonly op: Operator;
  /** 实体属性路径（FilterInfo.left），如 "birthDate" / "user.createdAt" */
  readonly propertyPath: string;
  /** 初始值；YYYY-MM-DD 格式字符串，缺省为空 */
  readonly defaultValue?: string;
}

export function useDateFilterItem(props: DateFilterItemProps) {
  const value = ref<string>(
    typeof props.defaultValue === "string" ? props.defaultValue : "",
  );

  function isEmpty(v: string): boolean {
    return v == null || v.trim() === "";
  }

  const filterInfo = computed<FilterInfo | null>(() => {
    if (isEmpty(value.value)) return null;
    return filter(props.propertyPath, props.op, con(value.value));
  });

  function reset(): void {
    value.value =
      typeof props.defaultValue === "string" ? props.defaultValue : "";
  }

  return { value, filter: filterInfo, reset };
}
