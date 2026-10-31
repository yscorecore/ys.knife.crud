import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import type { EnumOption, EnumOptionsSource, FilterItemApi, Operator } from "@ys-knife-crud/core";
import { useEnumFilterItem } from "@ys-knife-crud/react";
import { YsFilterItemLayout } from "./filterItemLayout";
import "./enumFilterItem.css";

export interface EnumFilterItemProps {
  /** 显示标签（渲染在控件上方） */
  label: string;
  /** 运算符；仅单选模式使用，多选模式按 1 项 Equals / 2+ 项 In 自动派生 */
  op: Operator;
  /** 实体属性路径（FilterInfo.left），如 "status" / "user.roleId" */
  propertyPath: string;
  /** 初始值；单选为单值（null=未选），多选为数组（空数组=未选） */
  defaultValue?: string | number | boolean | (string | number | boolean)[] | null;
  /** 占位文本 */
  placeholder?: string;
  /** 选项数据源：返回 Promise<EnumOption[]> */
  optionsSource: EnumOptionsSource;
  /** 是否可清空，默认 true */
  clearable?: boolean;
  /** 是否多选；默认 false */
  multiple?: boolean;
}

/**
 * YsEnumFilterItem：枚举单字段查询条件控件，支持单选与多选。
 * 选项由 optionsSource 异步加载；单选使用声明方 op，多选自动派生 Equals / In。
 */
export const YsEnumFilterItem = forwardRef<FilterItemApi, EnumFilterItemProps>(
  function YsEnumFilterItem(props, ref) {
    const { value, setValue, filter, reset } = useEnumFilterItem({
      op: props.op,
      propertyPath: props.propertyPath,
      defaultValue: props.defaultValue as never,
      multiple: props.multiple,
    });

    const [options, setOptions] = useState<EnumOption[]>([]);
    const [loading, setLoading] = useState(false);
    const sourceRef = useRef(props.optionsSource);
    sourceRef.current = props.optionsSource;

    // 与 Vue 版一致：仅在挂载时调用一次 optionsSource 加载选项。
    useEffect(() => {
      let alive = true;
      setLoading(true);
      sourceRef
        .current()
        .then((opts) => {
          if (alive) setOptions(opts);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, []);

    const api = useMemo<FilterItemApi>(
      () => ({
        get filter() {
          return filter;
        },
        reset,
      }),
      [filter, reset],
    );

    useImperativeHandle(ref, () => api, [api]);

    const selectOptions = options.map((opt) => ({
      label: opt.label,
      value: opt.value as string | number,
    }));

    return (
      <YsFilterItemLayout label={props.label} api={api}>
        {props.multiple ? (
          <Select
            mode="multiple"
            value={Array.isArray(value) ? (value as (string | number)[]) : []}
            options={selectOptions}
            onChange={(v: (string | number)[]) => setValue(v)}
            placeholder={props.placeholder}
            allowClear={props.clearable ?? true}
            loading={loading}
          />
        ) : (
          <Select
            value={(value ?? undefined) as string | number | undefined}
            options={selectOptions}
            onChange={(v: string | number) => setValue(v ?? null)}
            placeholder={props.placeholder}
            allowClear={props.clearable ?? true}
            loading={loading}
          />
        )}
      </YsFilterItemLayout>
    );
  },
);
