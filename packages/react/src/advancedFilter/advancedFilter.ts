import { useCallback, useMemo, useRef, useState } from "react";
import { FilterInfo, Operator, con, emptyFilter, filter as filterFn } from "ys.knife.query.js";
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
} from "@ys-knife-crud/core";
import {
  FIELD_TYPE_OPERATORS,
  defaultOperatorForType,
  inferColumnFieldType,
  isConditionGroup as coreIsConditionGroup,
  isMultiValueOperator,
  isNullOperator,
  isRangeOperator,
} from "@ys-knife-crud/core";

/**
 * 高级查询面板逻辑：UI 库无关（与 Vue 版 useAdvancedFilter 对应）。
 * 条件树形结构管理 + 递归聚合 FilterInfo。所有修改以不可变方式生成新树，
 * 以驱动 React 重渲染。
 */
export interface AdvancedFilterProps {
  /** 可供选择的字段列表（通常直接传 Meta.columns） */
  readonly columns: readonly Column[];
  /** 枚举字段数据源，按 propertyPath 映射 */
  readonly optionSources?: Record<string, EnumOptionsSource>;
}

/** 区间值（Between/NotBetween）；元素可为 null 表示该端未填 */
export type AdvancedRangeValue = [unknown, unknown] | null;

export interface UseAdvancedFilterResult {
  rootGroup: AdvancedConditionGroup;
  fieldTypeOf: (propertyPath: string) => AdvancedFieldType;
  operatorsOf: (propertyPath: string) => AdvancedOperator[];
  addLeaf: (parentId: string, index?: number) => void;
  addNestedGroup: (parentId: string, index?: number) => void;
  removeNode: (id: string) => void;
  changeField: (id: string, propertyPath: string) => void;
  changeOperator: (id: string, op: AdvancedOperator) => void;
  setGroupCombinator: (groupId: string, comb: AdvancedCombinator) => void;
  isConditionEmpty: (row: AdvancedCondition) => boolean;
  isConditionGroup: (node: AdvancedConditionNode) => node is AdvancedConditionGroup;
  filter: FilterInfoType;
  reset: () => void;
}

/** 更新某个 group 节点（不可变，未命中返回原树） */
function updateGroup(
  root: AdvancedConditionGroup,
  groupId: string,
  updater: (group: AdvancedConditionGroup) => AdvancedConditionGroup,
): AdvancedConditionGroup {
  if (root.id === groupId) return updater(root);
  let changed = false;
  const children = root.children.map((child) => {
    if (coreIsConditionGroup(child)) {
      const next = updateGroup(child, groupId, updater);
      if (next !== child) changed = true;
      return next;
    }
    return child;
  });
  return changed ? { ...root, children } : root;
}

/** 更新某个 leaf 节点（不可变，未命中返回原树） */
function updateLeaf(
  root: AdvancedConditionGroup,
  leafId: string,
  updater: (leaf: AdvancedCondition) => AdvancedCondition,
): AdvancedConditionGroup {
  let changed = false;
  const children = root.children.map((child) => {
    if (coreIsConditionGroup(child)) {
      const next = updateLeaf(child, leafId, updater);
      if (next !== child) changed = true;
      return next;
    }
    if (child.id === leafId) {
      changed = true;
      return updater(child);
    }
    return child;
  });
  return changed ? { ...root, children } : root;
}

/** 删除节点（不可变） */
function removeFromTree(
  root: AdvancedConditionGroup,
  nodeId: string,
): { group: AdvancedConditionGroup; removed: boolean } {
  let removed = false;
  const children: AdvancedConditionNode[] = [];
  for (const child of root.children) {
    if (child.id === nodeId) {
      removed = true;
      continue;
    }
    if (coreIsConditionGroup(child)) {
      const r = removeFromTree(child, nodeId);
      if (r.removed) removed = true;
      children.push(r.group);
    } else {
      children.push(child);
    }
  }
  return removed ? { group: { ...root, children }, removed } : { group: root, removed };
}

export function useAdvancedFilter(props: AdvancedFilterProps): UseAdvancedFilterResult {
  const seq = useRef(0);
  function nextId(prefix: "leaf" | "grp"): string {
    return `adv-${prefix}-${++seq.current}`;
  }

  /** propertyPath → 字段类型（enum 优先看 optionSources 是否配置） */
  const fieldTypeMap = useMemo(() => {
    const map = new Map<string, AdvancedFieldType>();
    for (const col of props.columns) {
      map.set(
        col.propertyPath,
        inferColumnFieldType(col, props.optionSources?.[col.propertyPath] !== undefined),
      );
    }
    return map;
  }, [props.columns, props.optionSources]);

  const fieldTypeOf = useCallback(
    (propertyPath: string): AdvancedFieldType => fieldTypeMap.get(propertyPath) ?? "string",
    [fieldTypeMap],
  );

  const operatorsOf = useCallback(
    (propertyPath: string): AdvancedOperator[] =>
      FIELD_TYPE_OPERATORS[fieldTypeOf(propertyPath)],
    [fieldTypeOf],
  );

  /** 按字段类型 + 操作符生成初始空值 */
  function emptyValue(type: AdvancedFieldType, op: AdvancedOperator): unknown {
    if (isNullOperator(op)) return null;
    if (isRangeOperator(op)) return [null, null];
    if (isMultiValueOperator(op)) return [];
    void type;
    return null;
  }

  /** 工厂：新建一行空叶子（默认选第一个字段 + 该类型默认操作符） */
  function newLeaf(): AdvancedCondition {
    const first = props.columns[0];
    const propertyPath = first?.propertyPath ?? "";
    const type = first ? fieldTypeOf(propertyPath) : "string";
    const op = defaultOperatorForType(type);
    return { id: nextId("leaf"), propertyPath, op, value: emptyValue(type, op) };
  }

  /** 工厂：新建一个嵌套 group（默认 AND + 1 个空叶子） */
  function newGroup(combinator: AdvancedCombinator = "and"): AdvancedConditionGroup {
    return { id: nextId("grp"), combinator, children: [newLeaf()] };
  }

  const [rootGroup, setRootGroup] = useState<AdvancedConditionGroup>(() => ({
    id: "root",
    combinator: "and",
    children: [newLeaf()],
  }));

  const addLeaf = useCallback((parentId: string, index?: number): void => {
    setRootGroup((prev) =>
      updateGroup(prev, parentId, (group) => {
        const leaf = newLeaf();
        const children = [...group.children];
        if (typeof index === "number") children.splice(index, 0, leaf);
        else children.push(leaf);
        return { ...group, children };
      }),
    );
  }, [props.columns]);

  /**
   * 在指定 group 内追加嵌套 group；新子组 combinator 与父组相反。
   */
  const addNestedGroup = useCallback((parentId: string, index?: number): void => {
    setRootGroup((prev) =>
      updateGroup(prev, parentId, (group) => {
        const childCombinator: AdvancedCombinator = group.combinator === "and" ? "or" : "and";
        const sub = newGroup(childCombinator);
        const children = [...group.children];
        if (typeof index === "number") children.splice(index, 0, sub);
        else children.push(sub);
        return { ...group, children };
      }),
    );
  }, [props.columns]);

  const removeNode = useCallback((id: string): void => {
    setRootGroup((prev) => {
      if (id === prev.id) return prev;
      return removeFromTree(prev, id).group;
    });
  }, []);

  const changeField = useCallback(
    (id: string, propertyPath: string): void => {
      const type = fieldTypeOf(propertyPath);
      setRootGroup((prev) =>
        updateLeaf(prev, id, (leaf) => {
          const op = defaultOperatorForType(type);
          return { ...leaf, propertyPath, op, value: emptyValue(type, op) };
        }),
      );
    },
    [fieldTypeOf],
  );

  const changeOperator = useCallback(
    (id: string, op: AdvancedOperator): void => {
      setRootGroup((prev) =>
        updateLeaf(prev, id, (leaf) => ({
          ...leaf,
          op,
          value: emptyValue(fieldTypeOf(leaf.propertyPath), op),
        })),
      );
    },
    [fieldTypeOf],
  );

  const setGroupCombinator = useCallback(
    (groupId: string, comb: AdvancedCombinator): void => {
      setRootGroup((prev) =>
        updateGroup(prev, groupId, (group) => ({ ...group, combinator: comb })),
      );
    },
    [],
  );

  /** 判断单行 leaf 是否未填有效值 */
  const isConditionEmpty = useCallback(
    (row: AdvancedCondition): boolean => {
      if (isNullOperator(row.op)) return false;
      const type = fieldTypeOf(row.propertyPath);
      const v = row.value;

      if (isRangeOperator(row.op)) {
        if (!Array.isArray(v) || v.length !== 2) return true;
        return (
          v[0] === null || v[0] === undefined || v[0] === "" ||
          v[1] === null || v[1] === undefined || v[1] === ""
        );
      }
      if (isMultiValueOperator(row.op)) {
        return !Array.isArray(v) || v.length === 0;
      }
      if (type === "boolean" || type === "number" || type === "date") {
        return v === null || v === undefined || v === "";
      }
      return (
        v === null ||
        v === undefined ||
        (typeof v === "string" && v.trim() === "")
      );
    },
    [fieldTypeOf],
  );

  /** 把单行 leaf 编辑态模型构造成 FilterInfo；未填值返回 null */
  function buildConditionFilter(row: AdvancedCondition): FilterInfoType | null {
    if (isConditionEmpty(row)) return null;
    if (row.op === "is_null") {
      const type = fieldTypeOf(row.propertyPath);
      if (type === "string") {
        return FilterInfo.createOr(
          filterFn(row.propertyPath, Operator.Equals, con(null)) as unknown as FilterInfo,
          filterFn(row.propertyPath, Operator.Equals, con("")) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      if (type === "array") {
        return FilterInfo.createOr(
          filterFn(row.propertyPath, Operator.Equals, con(null)) as unknown as FilterInfo,
          filterFn(`${row.propertyPath}.count`, Operator.Equals, con(0)) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      return filterFn(row.propertyPath, Operator.Equals, con(null)) as unknown as FilterInfoType;
    }
    if (row.op === "is_not_null") {
      const type = fieldTypeOf(row.propertyPath);
      if (type === "string") {
        return FilterInfo.createAnd(
          filterFn(row.propertyPath, Operator.NotEquals, con(null)) as unknown as FilterInfo,
          filterFn(row.propertyPath, Operator.NotEquals, con("")) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      if (type === "array") {
        return FilterInfo.createAnd(
          filterFn(row.propertyPath, Operator.NotEquals, con(null)) as unknown as FilterInfo,
          filterFn(`${row.propertyPath}.count`, Operator.GreaterThan, con(0)) as unknown as FilterInfo,
        ) as unknown as FilterInfoType;
      }
      return filterFn(row.propertyPath, Operator.NotEquals, con(null)) as unknown as FilterInfoType;
    }
    return filterFn(
      row.propertyPath,
      row.op as Operator,
      con(row.value as unknown as (string | null)[]),
    ) as unknown as FilterInfoType;
  }

  /** 递归聚合：空 group → null；单子项透传；多子项按 combinator 聚合 */
  function buildNodeFilter(node: AdvancedConditionNode): FilterInfoType | null {
    if (coreIsConditionGroup(node)) {
      const items = node.children
        .map(buildNodeFilter)
        .filter((f): f is FilterInfoType => f !== null);
      if (items.length === 0) return null;
      if (items.length === 1) return items[0]!;
      if (node.combinator === "or") {
        return FilterInfo.createOr(...(items as unknown as FilterInfo[])) as unknown as FilterInfoType;
      }
      return FilterInfo.createAnd(...(items as unknown as FilterInfo[])) as unknown as FilterInfoType;
    }
    return buildConditionFilter(node);
  }

  const filter = useMemo<FilterInfoType>(() => {
    const f = buildNodeFilter(rootGroup);
    return f ?? (emptyFilter() as unknown as FilterInfoType);
  }, [rootGroup, fieldTypeMap]);

  const reset = useCallback((): void => {
    const group = newGroup("and");
    group.id = "root";
    setRootGroup(group);
  }, [props.columns]);

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
    isConditionGroup: coreIsConditionGroup,
    filter,
    reset,
  };
}
