import { computed, ref } from "vue";
import { filter, con, Operator } from "ys.knife.query.js";
import type { FilterInfo, Operator as OperatorType } from "ys.knife.query.js";

/**
 * 枚举（enum）单字段查询条件逻辑：UI 库无关。
 *
 * 设计原则：每个具体 FilterItem 组件（Text/Date/DateRange/Enum...）只负责
 * 自己的一种类型，不在一个 composable 里实现 type 工厂模式。
 *
 * 单选模式（multiple=false，默认）：
 * - value 为 string | number | null（null 表示未选）
 * - 使用声明方指定的 op（常为 Equals）
 * - 值为空时 filterInfo 返回 null；非空时 filter(propertyPath, op, con(value))
 *
 * 多选模式（multiple=true）：
 * - value 为 (string | number)[]（空数组表示未选）
 * - op 由 composable 自动派生（声明方的 op 被忽略）：
 *   - 0 项 → filterInfo 返回 null（panel 端聚合时跳过）
 *   - 1 项 → filter(propertyPath, Operator.Equals, con(item))（自动 Equals）
 *   - 2+ 项 → filter(propertyPath, Operator.In, con(items))（自动 In）
 *
 * 数据源（options）、keyProperty、valueProperty 由 UI 层组件管理：
 * composable 只关心选中值与 filter 构造，不关心选项如何加载/渲染。
 *
 * 返回结构供 EnumFilterItem.vue 组装成 FilterItemApi。
 */

/**
 * 枚举 FilterItem 的 props 契约：composable 与 element-plus 组件共享。
 * 不含 label/placeholder/dataFunc/keyProperty/valueProperty 等 UI 字段
 * （由 element-plus 组件自己声明）。
 */
export interface EnumFilterItemProps {
  /**
   * 运算符；仅在单选模式下使用（常为 Operator.Equals）。
   * 多选模式下被忽略，composable 按「1 项→Equals，2+ 项→In」自动派生。
   */
  readonly op: OperatorType;
  /** 实体属性路径（FilterInfo.left），如 "status" / "user.roleId" */
  readonly propertyPath: string;
  /**
   * 初始值；单选模式为 string | number | null（null=未选），
   * 多选模式为 (string | number)[]（空数组=未选）。
   */
  readonly defaultValue?: string | number | null | (string | number)[];
  /** 是否多选；默认 false。多选时 2+ 项用 In，1 项用 Equals */
  readonly multiple?: boolean;
}

/** 多选模式下的值类型 */
export type EnumMultiValue = (string | number)[];
/** 单选模式下的值类型 */
export type EnumSingleValue = string | number | null;

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
      // 多选模式：1 项→Equals（自动），2+ 项→In（自动）
      if (arr.length === 1) {
        const v = arr[0];
        if (v == null) return null;
        return filter(props.propertyPath, Operator.Equals, con(v));
      }
      // con 的 ValueType 类型签名只允许 (string|null)[] 或 (number|null)[]，
      // 不支持 string 与 number 混合数组。但 con 运行时只做包装（不校验类型），
      // 实际场景中选项 key 通常同类型；这里用 unknown 双重断言绕过静态检查
      return filter(
        props.propertyPath,
        Operator.In,
        con(arr as unknown as (string | null)[]),
      );
    }
    const v = value.value as EnumSingleValue;
    if (v == null) return null;
    // 单选模式：使用声明方指定的 op
    return filter(props.propertyPath, props.op, con(v));
  });

  function reset(): void {
    value.value = isMultiple
      ? toMultiValue(props.defaultValue)
      : toSingleValue(props.defaultValue);
  }

  return { value, filter: filterInfo, reset };
}
