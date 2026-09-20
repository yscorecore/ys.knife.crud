import { computed, ref } from "vue";
import { filter, con, Operator } from "ys.knife.query.js";
import type { FilterInfo } from "ys.knife.query.js";

/**
 * 日期范围（daterange）单字段查询条件逻辑：UI 库无关。
 *
 * 设计原则：每个具体 FilterItem 组件（Text/Number/Date/DateRange/Bool...）只负责
 * 自己的一种类型，不在一个 composable 里实现 type 工厂模式。
 *
 * - value 为 [start, end] 字符串数组（YYYY-MM-DD 格式，由 UI 层 el-date-picker
 *   value-format 决定），composable 不处理 Date 对象，统一以字符串数组构造 FilterInfo
 * - op 内部固定为 Operator.Between，不需要声明方传 op（日期范围的语义天然是 between）
 * - 值为空（null / 非数组 / 长度不足 / start 或 end 任一为空）时 filterInfo 返回 null
 * - 非空时 filterInfo 返回 filter(propertyPath, Operator.Between, con([start, end]))；
 *   con 接受 (string|null)[]，正好适配 between op 的数组右值
 *
 * 返回结构供 DateRangeFilterItem.vue 组装成 FilterItemApi。
 */
export type DateRangeValue = [string, string] | null;

/**
 * 日期范围 FilterItem 的 props 契约：composable 与 element-plus 组件共享。
 * 不含 op 字段——日期范围语义天然是 Between，op 由 composable 内部固定。
 */
export interface DateRangeFilterItemProps {
  /** 实体属性路径（FilterInfo.left），如 "createdAt" / "user.registeredAt" */
  readonly propertyPath: string;
  /** 初始值；[start, end] 字符串数组，缺省为 null */
  readonly defaultValue?: [string, string];
}

export function useDateRangeFilterItem(props: DateRangeFilterItemProps) {
  function toRange(v: [string, string] | undefined): DateRangeValue {
    if (
      v &&
      v.length === 2 &&
      typeof v[0] === "string" &&
      typeof v[1] === "string"
    ) {
      return [v[0], v[1]];
    }
    return null;
  }

  const initial = toRange(props.defaultValue);
  const value = ref<DateRangeValue>(initial);

  function isEmpty(v: DateRangeValue): boolean {
    return v == null || v.length !== 2 || !v[0] || !v[1];
  }

  const filterInfo = computed<FilterInfo | null>(() => {
    if (isEmpty(value.value)) return null;
    const [start, end] = value.value as [string, string];
    return filter(props.propertyPath, Operator.Between, con([start, end]));
  });

  function reset(): void {
    value.value = initial;
  }

  return { value, filter: filterInfo, reset };
}
