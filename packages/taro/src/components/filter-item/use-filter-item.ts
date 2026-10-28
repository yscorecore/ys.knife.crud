import { computed, ref } from "vue";
import { con, filter, Operator } from "@ys-knife-crud/core";
import type { FilterInfo, Operator as OperatorType } from "@ys-knife-crud/core";

/**
 * FilterItem 的查询条件逻辑（小程序内联版）。
 *
 * 与 @ys-knife-crud/vue 的 useTextFilterItem / useDateFilterItem /
 * useDateRangeFilterItem / useEnumFilterItem 行为一致，这里内联一份是为了让
 * @ys-knife-crud/taro 不新增对 @ys-knife-crud/vue 的依赖（小程序侧依赖越少越好）。
 * 修改逻辑时请与 vue 包同步。
 *
 * 共同约定：
 * - 每个具体类型一个工厂函数，不做 type 工厂模式
 * - filter 返回 FilterInfo | null，null 表示「无查询条件」，由 YsFilterPanel 聚合时跳过
 * - 返回的 filter 是 computed，组件把它包成 getter 塞进 FilterItemApi，
 *   面板端的聚合 computed 才能 track 到值变化
 */

export interface TextFilterItemProps {
  /** 运算符；常传 Operator.Contains，也可传 Equals/StartsWith/EndsWith 等 */
  readonly op: OperatorType;
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

export interface DateFilterItemProps {
  /** 运算符；常传 Operator.Equals，也可传 GreaterThan / LessThan 等 */
  readonly op: OperatorType;
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

/** 日期区间的值：[start, end]，YYYY-MM-DD */
export type DateRangeValue = [string, string] | null;

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

/** 多选模式下的值类型 */
export type EnumMultiValue = (string | number)[];
/** 单选模式下的值类型 */
export type EnumSingleValue = string | number | null;

export interface EnumFilterItemProps {
  /**
   * 运算符；仅在单选模式下使用（常为 Operator.Equals）。
   * 多选模式下被忽略，按「1 项→Equals，2+ 项→In」自动派生。
   */
  readonly op: OperatorType;
  /** 实体属性路径（FilterInfo.left），如 "status" / "user.roleId" */
  readonly propertyPath: string;
  /** 初始值；单选为 string | number | null，多选为 (string | number)[] */
  readonly defaultValue?: string | number | null | (string | number)[];
  /** 是否多选；默认 false */
  readonly multiple?: boolean;
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

export function useEnumFilterItem(props: EnumFilterItemProps) {
  const isMultiple = props.multiple === true;

  const value = ref<EnumSingleValue | EnumMultiValue>(
    isMultiple ? toMultiValue(props.defaultValue) : toSingleValue(props.defaultValue),
  );

  function isEmpty(): boolean {
    const v = value.value;
    if (isMultiple) {
      return !Array.isArray(v) || v.length === 0;
    }
    if (v == null) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    return false;
  }

  const filterInfo = computed<FilterInfo | null>(() => {
    if (isEmpty()) return null;
    if (isMultiple) {
      const arr = value.value as EnumMultiValue;
      if (arr.length === 1) {
        const v = arr[0];
        if (v == null) return null;
        return filter(props.propertyPath, Operator.Equals, con(v));
      }
      // con 的类型签名不接受 string 与 number 混合数组，运行时只做包装，
      // 用 unknown 双重断言绕过静态检查
      return filter(
        props.propertyPath,
        Operator.In,
        con(arr as unknown as (string | null)[]),
      );
    }
    const v = value.value as EnumSingleValue;
    if (v == null) return null;
    return filter(props.propertyPath, props.op, con(v));
  });

  function reset(): void {
    value.value = isMultiple
      ? toMultiValue(props.defaultValue)
      : toSingleValue(props.defaultValue);
  }

  return { value, filter: filterInfo, reset };
}
