import { Operator } from "ys.knife.query.js";
import type { Column } from "./meta";

/**
 * 高级查询面板（YsAdvancedFilterPanel）的契约层：UI 库无关的类型与纯函数。
 *
 * 与普通 FilterPanel 的区别：
 * - 普通 FilterPanel：条件控件由使用方在插槽里逐个摆好，panel 只负责 AND 聚合
 * - 高级查询面板：使用方只传 Column[]（有哪些字段），终端用户自己
 *   选字段、选操作符、填值、增删条件行；条件行间支持任意嵌套的 AND/OR 组合
 *   （如 `(a) and ((b) or (c))`），由树形结构（AdvancedConditionGroup）承载
 */

/**
 * 条件行之间的组合方式：
 * - and：全部条件满足（FilterInfo.createAnd）
 * - or：任一条件满足（FilterInfo.createOr）
 *
 * 树形结构下，每个分组节点（AdvancedConditionGroup）持有一个 combinator，
 * 作为该组子项的聚合方式。不同分组的 combinator 可不同，从而支持
 * 任意嵌套组合，例如 `(a) and ((b) or (c))`（外层 AND、内层 OR）。
 */
export type AdvancedCombinator = "and" | "or";

/**
 * 高级查询关心的字段值类型（由 Column.dataTypeName 归一化推断）：
 * 决定该字段有哪些可选操作符，以及值区域渲染什么控件
 * （string→el-input / number→el-input-number / date→el-date-picker /
 *  boolean→true|false 下拉 / enum→带数据源的 el-select / array→无值控件，仅 is_null/is_not_null）
 */
export type AdvancedFieldType = "string" | "number" | "date" | "boolean" | "enum" | "array";

/**
 * 高级查询操作符：底层 Operator（来自 ys.knife.query.js）扩展两个
 * "为空 / 不为空" 操作符。这两个操作符不需要用户输入值，build 时映射成
 * `xx = null`（Operator.Equals + null）和 `xx != null`（Operator.NotEquals + null）。
 *
 * 之所以在本层扩展而不直接改 Operator：Operator 是外部包 ys.knife.query.js 的
 * 枚举，不能修改；本层把扩展操作符与底层 Operator 统一成一个 union，
 * UI 层用 AdvancedOperator，build 时再映射回底层 Operator。
 */
export type AdvancedOperator = Operator | "is_null" | "is_not_null";

/** 判断是否为"为空 / 不为空"操作符（不需要值控件，视为已填） */
export function isNullOperator(op: AdvancedOperator): boolean {
  return op === "is_null" || op === "is_not_null";
}

/**
 * 一条条件行（编辑态模型）：
 * - id：行内部唯一标识，仅用于 v-for :key 与删除定位
 * - propertyPath：选中的字段（对应 Column.propertyPath，作为 FilterInfo.left）
 * - op：选中的操作符
 * - value：条件值；Between/NotBetween 时为 [start, end]，
 *   In/NotIn 时为数组，boolean 时 false 是合法值（null 才表示未填）
 */
export interface AdvancedCondition {
  id: string;
  propertyPath: string;
  op: AdvancedOperator;
  value: unknown;
}

/**
 * 嵌套分组节点（带组合符的子组）：编辑态模型为树形，
 * 根节点（rootGroup）本身也是一个 AdvancedConditionGroup。
 * children 可混合 leaf 与子 group，实现任意深度的 AND/OR 嵌套，
 * 例如 `(a) and ((b) or (c))`。
 */
export interface AdvancedConditionGroup {
  id: string;
  combinator: AdvancedCombinator;
  children: AdvancedConditionNode[];
}

/** 树节点：叶子条件行 或 分组节点 */
export type AdvancedConditionNode = AdvancedCondition | AdvancedConditionGroup;

/** 类型断言辅助：判断节点是否为分组（有 children 字段） */
export function isConditionGroup(
  node: AdvancedConditionNode,
): node is AdvancedConditionGroup {
  return "children" in node;
}

/** 操作符 → 中文文案（操作符下拉直接使用） */
export const OPERATOR_LABELS: Record<AdvancedOperator, string> = {
  [Operator.Equals]: "等于",
  [Operator.NotEquals]: "不等于",
  [Operator.GreaterThan]: "大于",
  [Operator.GreaterThanOrEqual]: "大于等于",
  [Operator.LessThan]: "小于",
  [Operator.LessThanOrEqual]: "小于等于",
  [Operator.Between]: "介于",
  [Operator.NotBetween]: "不介于",
  [Operator.In]: "属于",
  [Operator.NotIn]: "不属于",
  [Operator.StartsWith]: "开头是",
  [Operator.NotStartsWith]: "开头不是",
  [Operator.EndsWith]: "结尾是",
  [Operator.NotEndsWith]: "结尾不是",
  [Operator.Contains]: "包含",
  [Operator.NotContains]: "不包含",
  is_null: "为空",
  is_not_null: "不为空",
};

/**
 * 每种字段类型允许使用的操作符（顺序即操作符下拉中的展示顺序，
 * 第一个为该类型的默认操作符）。
 * - string：模糊匹配为主（包含/等于/开头/结尾/多值）
 * - number / date：比较 + 区间，不提供 In（数字/日期多值输入 UX 差，区间已覆盖主场景）
 * - boolean：仅等值判断
 * - enum：等值 + 多值（选项来自 EnumOptionsSource）
 */
export const FIELD_TYPE_OPERATORS: Record<AdvancedFieldType, AdvancedOperator[]> = {
  string: [
    Operator.Contains,
    Operator.NotContains,
    Operator.Equals,
    Operator.NotEquals,
    Operator.StartsWith,
    Operator.EndsWith,
    Operator.In,
    Operator.NotIn,
    "is_null",
    "is_not_null",
  ],
  number: [
    Operator.Equals,
    Operator.NotEquals,
    Operator.GreaterThan,
    Operator.GreaterThanOrEqual,
    Operator.LessThan,
    Operator.LessThanOrEqual,
    Operator.Between,
    Operator.NotBetween,
    "is_null",
    "is_not_null",
  ],
  date: [
    Operator.Equals,
    Operator.NotEquals,
    Operator.GreaterThan,
    Operator.GreaterThanOrEqual,
    Operator.LessThan,
    Operator.LessThanOrEqual,
    Operator.Between,
    Operator.NotBetween,
    "is_null",
    "is_not_null",
  ],
  boolean: [Operator.Equals, Operator.NotEquals, "is_null", "is_not_null"],
  enum: [
    Operator.Equals,
    Operator.NotEquals,
    Operator.In,
    Operator.NotIn,
    "is_null",
    "is_not_null",
  ],
  array: ["is_null", "is_not_null"],
};

/** Between / NotBetween 需要两个值（区间） */
export function isRangeOperator(op: AdvancedOperator): boolean {
  return op === Operator.Between || op === Operator.NotBetween;
}

/** In / NotIn 需要数组值（多值） */
export function isMultiValueOperator(op: AdvancedOperator): boolean {
  return op === Operator.In || op === Operator.NotIn;
}

/** 该字段类型的默认操作符（FIELD_TYPE_OPERATORS 列表第一项；兜底 Equals） */
export function defaultOperatorForType(type: AdvancedFieldType): AdvancedOperator {
  return FIELD_TYPE_OPERATORS[type][0] ?? Operator.Equals;
}

/**
 * 由列元数据推断高级查询字段类型。
 *
 * 推断优先级：
 * 1. 该字段在 optionSources 中配置了枚举数据源 → enum
 *    （dataTypeName 是什么不重要，显式数据源优先）
 * 2. dataTypeName 关键字归一化：bool→boolean；date/time→date；
 *    各类数值类型名（int/long/double/decimal/number...）→ number
 * 3. 兜底为 string
 *
 * dataTypeName 来自后端元数据，命名风格不固定（String / string / Int32 /
 * System.DateTime 都可能），所以统一转小写后做关键字包含匹配，不要求精确枚举。
 */
export function inferFieldType(
  dataName: string | undefined,
  hasEnumSource = false,
): AdvancedFieldType {
  if (hasEnumSource) return "enum";
  const t = (dataName ?? "").toLowerCase();
  // 数组类型（String[] / Int32[] / List<T> / IEnumerable<T> / array 等）
  if (
    t.includes("[]") ||
    t.includes("array") ||
    t.includes("list<") ||
    t.includes("collection<") ||
    t.includes("ienumerable")
  ) {
    return "array";
  }
  if (t.includes("bool")) return "boolean";
  if (t.includes("date") || t.includes("time")) return "date";
  if (
    t.includes("int") ||
    t.includes("long") ||
    t.includes("short") ||
    t.includes("byte") ||
    t.includes("double") ||
    t.includes("decimal") ||
    t.includes("float") ||
    t.includes("number")
  ) {
    return "number";
  }
  return "string";
}

/** 便捷重载：直接传 Column + 是否配置了枚举数据源 */
export function inferColumnFieldType(column: Column, hasEnumSource = false): AdvancedFieldType {
  return inferFieldType(column.dataTypeName, hasEnumSource);
}
