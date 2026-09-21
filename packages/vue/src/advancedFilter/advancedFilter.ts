import { computed, ref } from "vue";
import { FilterInfo, Operator, con, emptyFilter, filter } from "ys.knife.query.js";
import type { FilterInfo as FilterInfoType } from "ys.knife.query.js";
import type {
  AdvancedCombinator,
  AdvancedCondition,
  AdvancedConditionGroup,
  AdvancedConditionNode,
  AdvancedFieldType,
  AdvancedOperator,
  Column,
  EnumOptionsSource,
} from "@ys.knife.crud/core";
import { isConditionGroup, isNullOperator } from "@ys.knife.crud/core";
import {
  FIELD_TYPE_OPERATORS,
  defaultOperatorForType,
  inferColumnFieldType,
  isMultiValueOperator,
  isRangeOperator,
} from "@ys.knife.crud/core";

/**
 * 高级查询面板逻辑：UI 库无关。条件树形结构管理 + 递归聚合 FilterInfo。
 *
 * 数据模型为一棵 AdvancedConditionGroup 树：
 * - 根节点 rootGroup（id 固定 "root"，combinator 默认 and）；
 * - 每个 group 的 children 可混合 leaf 与子 group；
 * - 每行 leaf = 字段 + 操作符 + 值，切换字段重置 op/value，切换 op 按 op 形态重置 value；
 * - 聚合：递归 buildNodeFilter，group 内子项过滤空值（null）后用
 *   FilterInfo.createAnd / createOr 聚合；空 group → null（父级跳过）；
 *   单子项透传（避免 (a) 多余括号）；全空 → emptyFilter()。
 *
 * 判空语义（仅针对 leaf）：
 * - string：null/空白串为空
 * - number/date 单值：null/undefined/"" 为空（0 是合法值）
 * - boolean：仅 null/undefined 为空（false 是合法值）
 * - 区间：两端都要填
 * - 多值：数组长度 > 0
 */

export interface AdvancedFilterProps {
  /** 可供选择的字段列表（通常直接传 Meta.columns；隐藏列也可查询，不做 showForDisplay 过滤） */
  readonly columns: readonly Column[];
  /**
   * 枚举字段数据源，按 propertyPath 映射；命中的字段推断为 enum 类型，
   * 值区域渲染带异步选项的下拉。
   */
  readonly optionSources?: Record<string, EnumOptionsSource>;
}

/** 区间值（Between/NotBetween）；元素可为 null 表示该端未填 */
export type AdvancedRangeValue = [unknown, unknown] | null;

export function useAdvancedFilter(props: AdvancedFilterProps) {
  let seq = 0;
  function nextId(prefix: "leaf" | "grp"): string {
    return `adv-${prefix}-${++seq}`;
  }

  /** propertyPath → 字段类型（enum 优先看 optionSources 是否配置） */
  const fieldTypeMap = computed(() => {
    const map = new Map<string, AdvancedFieldType>();
    for (const col of props.columns) {
      map.set(
        col.propertyPath,
        inferColumnFieldType(col, props.optionSources?.[col.propertyPath] !== undefined),
      );
    }
    return map;
  });

  /** 取字段类型；未知路径兜底 string */
  function fieldTypeOf(propertyPath: string): AdvancedFieldType {
    return fieldTypeMap.value.get(propertyPath) ?? "string";
  }

  /** 该字段当前可选的操作符列表（字段类型改变后下拉选项随之变化） */
  function operatorsOf(propertyPath: string): AdvancedOperator[] {
    return FIELD_TYPE_OPERATORS[fieldTypeOf(propertyPath)];
  }

  /** 按字段类型 + 操作符生成初始空值 */
  function emptyValue(type: AdvancedFieldType, op: AdvancedOperator): unknown {
    // 为空 / 不为空不需要值
    if (isNullOperator(op)) return null;
    if (isRangeOperator(op)) return [null, null];
    if (isMultiValueOperator(op)) return [];
    // boolean/string/number/date 单值统一 null，由 UI 层控件解释
    void type;
    return null;
  }

  /** 工厂：新建一行空叶子（默认选第一个字段 + 该类型默认操作符） */
  function newLeaf(): AdvancedCondition {
    const first = props.columns[0];
    // columns 为空时仍构造一个 leaf（属性路径留空，UI 显示占位），
    // buildConditionFilter 会因路径未匹配字段类型判空跳过
    const propertyPath = first?.propertyPath ?? "";
    const type = first ? fieldTypeOf(propertyPath) : "string";
    const op = defaultOperatorForType(type);
    return {
      id: nextId("leaf"),
      propertyPath,
      op,
      value: emptyValue(type, op),
    };
  }

  /** 工厂：新建一个嵌套 group（默认 AND + 1 个空叶子） */
  function newGroup(combinator: AdvancedCombinator = "and"): AdvancedConditionGroup {
    return {
      id: nextId("grp"),
      combinator,
      children: [newLeaf()],
    };
  }

  /** 根 group：默认 AND + 1 个空叶子 */
  const rootGroup = ref<AdvancedConditionGroup>({
    id: "root",
    combinator: "and",
    children: [newLeaf()],
  });

  /** 递归查找节点；命中返回该节点，未命中返回 null */
  function findNode(
    id: string,
    group: AdvancedConditionGroup = rootGroup.value,
  ): AdvancedConditionNode | null {
    for (const child of group.children) {
      if (child.id === id) return child;
      if (isConditionGroup(child)) {
        const found = findNode(id, child);
        if (found) return found;
      }
    }
    return null;
  }

  /** 递归查找某节点所属的父 group；命中返回父，未命中返回 null */
  function findParentGroup(
    id: string,
    group: AdvancedConditionGroup = rootGroup.value,
  ): AdvancedConditionGroup | null {
    for (const child of group.children) {
      if (child.id === id) return group;
      if (isConditionGroup(child)) {
        const found = findParentGroup(id, child);
        if (found) return found;
      }
    }
    return null;
  }

  /** 在指定 group 内追加新叶子（默认追加到末尾） */
  function addLeaf(parentId: string, index?: number): void {
    const parent = parentId === rootGroup.value.id
      ? rootGroup.value
      : findNode(parentId);
    if (!parent || !isConditionGroup(parent)) return;
    const leaf = newLeaf();
    if (typeof index === "number") {
      parent.children.splice(index, 0, leaf);
    } else {
      parent.children.push(leaf);
    }
  }

  /**
   * 在指定 group 内追加嵌套 group。
   * 新子组的 combinator 与父组相反（父 AND → 子 OR；父 OR → 子 AND）：
   * 嵌套组的存在意义就是引入不同组合符，默认相反让用户少切一次。
   */
  function addNestedGroup(parentId: string, index?: number): void {
    const parent = parentId === rootGroup.value.id
      ? rootGroup.value
      : findNode(parentId);
    if (!parent || !isConditionGroup(parent)) return;
    const childCombinator: AdvancedCombinator =
      parent.combinator === "and" ? "or" : "and";
    const sub = newGroup(childCombinator);
    if (typeof index === "number") {
      parent.children.splice(index, 0, sub);
    } else {
      parent.children.push(sub);
    }
  }

  /** 删除任意节点（root 自身不允许删） */
  function removeNode(id: string): void {
    if (id === rootGroup.value.id) return;
    const parent = findParentGroup(id);
    if (!parent) return;
    const idx = parent.children.findIndex((c) => c.id === id);
    if (idx >= 0) parent.children.splice(idx, 1);
  }

  /** 切换 leaf 字段：字段类型可能变化，操作符重置为新类型的默认操作符，值清空 */
  function changeField(id: string, propertyPath: string): void {
    const node = findNode(id);
    if (!node || isConditionGroup(node)) return;
    node.propertyPath = propertyPath;
    const type = fieldTypeOf(propertyPath);
    node.op = defaultOperatorForType(type);
    node.value = emptyValue(type, node.op);
  }

  /** 切换 leaf 操作符：值形态可能变化（单值/区间/数组/无值），重置值 */
  function changeOperator(id: string, op: AdvancedOperator): void {
    const node = findNode(id);
    if (!node || isConditionGroup(node)) return;
    node.op = op;
    node.value = emptyValue(fieldTypeOf(node.propertyPath), op);
  }

  /** 改 group 组合符 */
  function setGroupCombinator(groupId: string, comb: AdvancedCombinator): void {
    const node = groupId === rootGroup.value.id
      ? rootGroup.value
      : findNode(groupId);
    if (node && isConditionGroup(node)) node.combinator = comb;
  }

  /** 判断单行 leaf 是否已填有效值；未填的不参与聚合 */
  function isConditionEmpty(row: AdvancedCondition): boolean {
    // 为空 / 不为空不需要值，视为已填
    if (isNullOperator(row.op)) return false;
    const type = fieldTypeOf(row.propertyPath);
    const v = row.value;

    if (isRangeOperator(row.op)) {
      if (!Array.isArray(v) || v.length !== 2) return true;
      return (
        v[0] === null ||
        v[0] === undefined ||
        v[0] === "" ||
        v[1] === null ||
        v[1] === undefined ||
        v[1] === ""
      );
    }
    if (isMultiValueOperator(row.op)) {
      return !Array.isArray(v) || v.length === 0;
    }
    if (type === "boolean") {
      // false 是合法条件值，只有 null/undefined 算未填
      return v === null || v === undefined || v === "";
    }
    if (type === "number" || type === "date") {
      // 0 对 number 是合法值，不能当空
      return v === null || v === undefined || v === "";
    }
    // string：空白串视为未填
    return (
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "")
    );
  }

  /** 把单行 leaf 编辑态模型构造成 FilterInfo；未填值返回 null */
  function buildConditionFilter(row: AdvancedCondition): FilterInfoType | null {
    if (isConditionEmpty(row)) return null;
    // 为空 / 不为空：按字段类型翻译
    if (row.op === "is_null") {
      const type = fieldTypeOf(row.propertyPath);
      if (type === "string") {
        // 字符串为空：xx == null || xx == ''
        return FilterInfo.createOr(
          filter(row.propertyPath, Operator.Equals, con(null)) as unknown as FilterInfo,
          filter(row.propertyPath, Operator.Equals, con("")) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      if (type === "array") {
        // 数组为空：xx == null || xx.count == 0
        return FilterInfo.createOr(
          filter(row.propertyPath, Operator.Equals, con(null)) as unknown as FilterInfo,
          filter(`${row.propertyPath}.count`, Operator.Equals, con(0)) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      // 其他类型（number/date/boolean/enum）：仅判 null
      return filter(
        row.propertyPath,
        Operator.Equals,
        con(null),
      ) as unknown as FilterInfoType;
    }
    if (row.op === "is_not_null") {
      const type = fieldTypeOf(row.propertyPath);
      if (type === "string") {
        // 字符串不为空：xx != null && xx != ''
        return FilterInfo.createAnd(
          filter(row.propertyPath, Operator.NotEquals, con(null)) as unknown as FilterInfo,
          filter(row.propertyPath, Operator.NotEquals, con("")) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      if (type === "array") {
        // 数组不为空：xx != null && xx.count > 0
        return FilterInfo.createAnd(
          filter(row.propertyPath, Operator.NotEquals, con(null)) as unknown as FilterInfo,
          filter(`${row.propertyPath}.count`, Operator.GreaterThan, con(0)) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      // 其他类型（number/date/boolean/enum）：仅判 != null
      return filter(
        row.propertyPath,
        Operator.NotEquals,
        con(null),
      ) as unknown as FilterInfoType;
    }
    // con 的 ValueType 类型签名对数组值要求 (string|null)[] / (number|null)[]，
    // 编辑态 value 是 unknown（区间/多值/boolean 都可能）。运行时 con 只做包装不校验，
    // 这里与 enumFilterItem 一样用 unknown 双重断言绕过静态签名。
    return filter(
      row.propertyPath,
      row.op as Operator,
      con(row.value as unknown as (string | null)[]),
    ) as unknown as FilterInfoType;
  }

  /**
   * 递归聚合：group → 子项递归后过滤 null；空 children 返回 null；
   * 单子项透传（避免 (a) 多余括号）；多子项按 combinator 用 createAnd / createOr 聚合。
   * 跨包 dts 解析时 FilterInfo protected 字段会被剥离，createAnd/createOr 返回值
   * 与 FilterInfo 结构比较失败，用 as unknown as FilterInfo 显式绕过（运行时兼容）。
   */
  function buildNodeFilter(node: AdvancedConditionNode): FilterInfoType | null {
    if (isConditionGroup(node)) {
      const items = node.children
        .map(buildNodeFilter)
        .filter((f): f is FilterInfoType => f !== null);
      if (items.length === 0) return null;
      // noUncheckedIndexedAccess 让 items[0] 含 undefined；length 已 ≥1，用 ! 收窄
      if (items.length === 1) return items[0]!;
      if (node.combinator === "or") {
        return FilterInfo.createOr(
          ...(items as unknown as FilterInfo[]),
        ) as unknown as FilterInfoType;
      }
      return FilterInfo.createAnd(
        ...(items as unknown as FilterInfo[]),
      ) as unknown as FilterInfoType;
    }
    return buildConditionFilter(node);
  }

  const filterInfo = computed<FilterInfoType>(() => {
    const f = buildNodeFilter(rootGroup.value);
    return f ?? (emptyFilter() as unknown as FilterInfoType);
  });

  /** 重置：重建 root group（AND + 1 空叶） */
  function reset(): void {
    rootGroup.value = newGroup("and");
    // 保留 id="root" 以保证 UI 模板 :key 稳定
    rootGroup.value.id = "root";
  }

  return {
    rootGroup,
    fieldTypeOf,
    operatorsOf,
    addLeaf,
    addNestedGroup,
    removeNode,
    changeField,
    changeOperator,
    setGroupCombinator,
    isConditionEmpty,
    isConditionGroup,
    filter: filterInfo,
    reset,
  };
}
