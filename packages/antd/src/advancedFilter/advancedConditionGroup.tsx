import { useContext } from "react";
import { Button, Radio, Select } from "antd";
import {
  OPERATOR_LABELS,
  isConditionGroup,
  isNullOperator,
  type AdvancedCondition,
  type AdvancedConditionGroup as ConditionGroup,
  type AdvancedConditionNode,
  type AdvancedOperator,
  type Column,
} from "@ys-knife-crud/core";
import { ADVANCED_FILTER_CONTEXT } from "./advancedFilterContext";
import { YsAdvancedValueEditor } from "./advancedValueEditor";
import "./advancedConditionGroup.css";

export interface AdvancedConditionGroupProps {
  /** 本分组节点数据 */
  group: ConditionGroup;
  /** 嵌套层级；0 = 根（无边框），>=1 = 嵌套（左侧色条 + 缩进） */
  level?: number;
}

/**
 * YsAdvancedConditionGroup：递归子组件，渲染一个分组节点（combinator + children）。
 * 上下文由顶层 YsAdvancedFilterPanel 经 ADVANCED_FILTER_CONTEXT 注入。
 */
export function YsAdvancedConditionGroup(props: AdvancedConditionGroupProps) {
  const ctx = useContext(ADVANCED_FILTER_CONTEXT);
  if (!ctx) return null;

  const { group, level = 0 } = props;

  const onCombinatorChange = (comb: unknown): void => {
    if (comb === "and" || comb === "or") ctx.api.setGroupCombinator(group.id, comb);
  };

  const columnOf = (propertyPath: string): Column | undefined =>
    ctx.columns.find((c) => c.propertyPath === propertyPath);

  const valueFormatOf = (propertyPath: string): string =>
    columnOf(propertyPath)?.displayFormat ?? "YYYY-MM-DD";

  return (
    <div className={`yk-adv-group level-${level}${level === 0 ? " is-root" : ""}`}>
      <div className="yk-adv-group__header">
        <span className="yk-adv-group__comb-label">满足</span>
        <Radio.Group
          size="small"
          value={group.combinator}
          onChange={(e) => onCombinatorChange(e.target.value)}
        >
          <Radio.Button value="and">全部</Radio.Button>
          <Radio.Button value="or">任一</Radio.Button>
        </Radio.Group>
        <span className="yk-adv-group__comb-label">条件</span>
        <span className="yk-adv-group__actions">
          <Button type="link" onClick={() => ctx.api.addLeaf(group.id)}>
            + 条件
          </Button>
          <Button type="link" onClick={() => ctx.api.addNestedGroup(group.id)}>
            + 嵌套组
          </Button>
          {level > 0 && (
            <Button type="link" danger onClick={() => ctx.api.removeNode(group.id)}>
              删除组
            </Button>
          )}
        </span>
      </div>

      <div className="yk-adv-group__children">
        {group.children.map((child: AdvancedConditionNode) => {
          if (isConditionGroup(child)) {
            return (
              <div className="yk-adv-group__nested" key={child.id}>
                <YsAdvancedConditionGroup group={child} level={level + 1} />
              </div>
            );
          }

          const leaf = child as AdvancedCondition;
          return (
            <div className="yk-adv-group__row" key={leaf.id}>
              <Select
                className="yk-adv-group__field"
                value={leaf.propertyPath || undefined}
                options={ctx.columns.map((col) => ({
                  label: col.displayName ?? col.propertyPath,
                  value: col.propertyPath,
                }))}
                placeholder="选择字段"
                showSearch
                optionFilterProp="label"
                onChange={(v: string) => ctx.api.changeField(leaf.id, v)}
              />

              <Select
                className="yk-adv-group__op"
                value={leaf.op}
                options={ctx.api.operatorsOf(leaf.propertyPath).map((op) => ({
                  label: OPERATOR_LABELS[op as AdvancedOperator] ?? String(op),
                  value: op as string,
                }))}
                placeholder="操作符"
                showSearch
                optionFilterProp="label"
                onChange={(v: string) => ctx.api.changeOperator(leaf.id, v as AdvancedOperator)}
              />

              {!isNullOperator(leaf.op) && (
                <YsAdvancedValueEditor
                  className={[
                    "yk-adv-group__value",
                    ctx.api.isConditionEmpty(leaf) ? "is-invalid" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  fieldType={ctx.api.fieldTypeOf(leaf.propertyPath)}
                  op={leaf.op}
                  value={leaf.value}
                  options={ctx.optionsMap[leaf.propertyPath] ?? []}
                  optionsLoading={ctx.loadingMap[leaf.propertyPath] === true}
                  valueFormat={valueFormatOf(leaf.propertyPath)}
                  onChange={(v) => ctx.updateValue(leaf.id, v)}
                />
              )}

              <Button
                className="yk-adv-group__remove"
                type="link"
                danger
                onClick={() => ctx.api.removeNode(leaf.id)}
              >
                删除
              </Button>
            </div>
          );
        })}

        {group.children.length === 0 && (
          <div className="yk-adv-group__empty">暂无条件，点击「+ 条件」或「+ 嵌套组」</div>
        )}
      </div>
    </div>
  );
}
