import { computed, ref } from "vue";
import { filter, con } from "ys.knife.query.js";
import type { FilterInfo, Operator } from "ys.knife.query.js";

/**
 * 文本（string）单字段查询条件逻辑：UI 库无关。
 *
 * 设计原则：每个具体 FilterItem 组件（Text/Number/Date/DateRange/Bool...）只负责
 * 自己的一种类型，不在一个 composable 里实现 type 工厂模式；后续追加新类型时新建对应的
 * useXxxFilterItem + XxxFilterItemProps。
 *
 * - value 为 string，op 由声明方指定（常为 Contains）
 * - 值为空（null/空串/纯空白）时 filterInfo 返回 null（表示「无查询条件」，
 *   由 panel 端聚合时直接跳过，不参与 createAnd）
 * - 非空时 filterInfo 返回 filter(propertyPath, op, con(value))；
 *   con 把原始值包装成 Constant（ys.knife.query.js 的标准右值类型）
 *
 * 返回结构供 TextFilterItem.vue 组装成 FilterItemApi（filter 是 getter 读 computed.value，
 * 使 panel 端的 filter computed 能 track 到本 item 的 value 变化）；value ref 留给模板 v-model 用。
 */

/**
 * 文本 FilterItem 的 props 契约：composable 与 element-plus 组件共享。
 * 不在 core 层定义通用 FilterItemProps，因各类型 props 字段差异较大
 * （daterange 不需要 op、date 需要 valueFormat、number 可能需要 min/max 等）。
 */
export interface TextFilterItemProps {
  /** 运算符；常传 Operator.Contains，也可传 Equals/StartsWith/EndsWith 等 */
  readonly op: Operator;
  /** 实体属性路径（FilterInfo.left），如 "name" / "user.name" */
  readonly propertyPath: string;
  /** 初始值；缺省为空字符串 */
  readonly defaultValue?: string;
}

export function useTextFilterItem(props: TextFilterItemProps) {
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
