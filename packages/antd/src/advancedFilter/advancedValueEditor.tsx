import { useState } from "react";
import type { ReactNode } from "react";
import { Button, DatePicker, Input, InputNumber, Popover, Select } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Operator } from "@ys-knife-crud/core";
import type {
  AdvancedFieldType,
  AdvancedOperator,
  EnumOption,
} from "@ys-knife-crud/core";
import "./advancedValueEditor.css";

export interface AdvancedValueEditorProps {
  /** 字段类型（决定控件种类） */
  fieldType: AdvancedFieldType;
  /** 当前操作符（决定单值/区间/多值/无值形态） */
  op: AdvancedOperator;
  /** 受控值；形态由 fieldType + op 决定（单值/区间数组/多值数组/boolean） */
  value: unknown;
  /** enum 类型的可选项（父组件按字段数据源异步加载后传入） */
  options?: EnumOption[];
  /** enum 选项加载中 */
  optionsLoading?: boolean;
  /** 日期格式化串，默认 YYYY-MM-DD */
  valueFormat?: string;
  /** 值变化回调（替代 Vue 的 update:modelValue） */
  onChange?: (value: unknown) => void;
  /** 附加类名（如行级红框提示） */
  className?: string;
}

const boolOptions: EnumOption[] = [
  { label: "是", value: true },
  { label: "否", value: false },
];

/** 最近 N 天区间（返回 dayjs，供 RangePicker presets 使用） */
function recentRange(days: number): [Dayjs, Dayjs] {
  const end = dayjs();
  return [end.subtract(days, "day"), end];
}

/**
 * YsAdvancedValueEditor：高级查询条件行里的「值」控件（受控组件）。
 *
 * - string 单值：Input；In/NotIn：可手输的多选下拉（tags）
 * - number 单值：InputNumber；Between/NotBetween：两个 InputNumber（起 ~ 止）
 * - date 单值：DatePicker；Between/NotBetween：RangePicker + 最近 N 天
 * - boolean：是 / 否下拉（false 是合法值，undefined 表示未选）
 * - enum 单值：Select；In/NotIn：多选 Select
 */
export function YsAdvancedValueEditor(props: AdvancedValueEditorProps) {
  const [recentDays, setRecentDays] = useState(7);

  const valueFormat = props.valueFormat ?? "YYYY-MM-DD";
  const isRange = props.op === Operator.Between || props.op === Operator.NotBetween;
  const isMulti = props.op === Operator.In || props.op === Operator.NotIn;

  const raw = props.value;
  const stringValue = typeof raw === "string" ? raw : "";
  const numberValue = typeof raw === "number" ? raw : undefined;
  const boolValue = typeof raw === "boolean" ? raw : undefined;
  const enumValue =
    typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
      ? raw
      : undefined;
  const multiValue = Array.isArray(raw) ? (raw as (string | number | boolean)[]) : [];
  const dateRangeValue: [Dayjs, Dayjs] | null =
    Array.isArray(raw) &&
    raw.length === 2 &&
    typeof raw[0] === "string" &&
    typeof raw[1] === "string"
      ? [dayjs(raw[0]), dayjs(raw[1])]
      : null;
  const rangeStart =
    Array.isArray(raw) && typeof raw[0] === "number" ? raw[0] : undefined;
  const rangeEnd =
    Array.isArray(raw) && typeof raw[1] === "number" ? raw[1] : undefined;

  const selectOptions = (props.options ?? []).map((opt) => ({
    label: opt.label,
    value: opt.value as string | number,
  }));

  const emit = (next: unknown): void => props.onChange?.(next);

  const applyRecentDays = (): void => {
    const n = recentDays;
    if (!n || n < 1) return;
    const [start, end] = recentRange(n);
    emit([start.format(valueFormat), end.format(valueFormat)]);
  };

  let editor: ReactNode;

  if (props.fieldType === "string" && isMulti) {
    editor = (
      <Select
        mode="tags"
        value={multiValue as string[]}
        onChange={(v: string[]) => emit(v)}
        tokenSeparators={[",", "，"]}
        placeholder="输入后回车添加"
        style={{ width: "100%" }}
      />
    );
  } else if (props.fieldType === "string") {
    editor = (
      <Input
        value={stringValue}
        onChange={(e) => emit(e.target.value)}
        placeholder="请输入"
        allowClear
      />
    );
  } else if (props.fieldType === "number" && isRange) {
    editor = (
      <>
        <InputNumber
          className="yk-advanced-value-editor__num"
          value={rangeStart}
          onChange={(v) => emit([v ?? null, rangeEnd ?? null])}
          placeholder="最小值"
          controls={false}
        />
        <span className="yk-advanced-value-editor__sep">~</span>
        <InputNumber
          className="yk-advanced-value-editor__num"
          value={rangeEnd}
          onChange={(v) => emit([rangeStart ?? null, v ?? null])}
          placeholder="最大值"
          controls={false}
        />
      </>
    );
  } else if (props.fieldType === "number") {
    editor = (
      <InputNumber
        value={numberValue}
        onChange={(v) => emit(v ?? null)}
        placeholder="请输入数字"
        controls={false}
        style={{ width: "100%" }}
      />
    );
  } else if (props.fieldType === "date" && isRange) {
    editor = (
      <>
        <DatePicker.RangePicker
          className="yk-advanced-value-editor__daterange-picker"
          value={dateRangeValue}
          format={valueFormat}
          placeholder={["开始日期", "结束日期"]}
          presets={[
            { label: "最近 7 天", value: () => recentRange(7) },
            { label: "最近 30 天", value: () => recentRange(30) },
            { label: "最近 90 天", value: () => recentRange(90) },
          ]}
          onChange={(dates, dateStrings) => {
            if (!dates) emit(null);
            else emit([dateStrings[0], dateStrings[1]]);
          }}
        />
        <Popover
          trigger="click"
          placement="bottom"
          content={
            <div className="yk-advanced-value-editor__recent-pop">
              <span>最近</span>
              <InputNumber
                className="yk-advanced-value-editor__recent-input"
                value={recentDays}
                onChange={(v) => setRecentDays(typeof v === "number" ? v : 1)}
                min={1}
                controls={false}
              />
              <span>天</span>
              <Button type="primary" size="small" onClick={applyRecentDays}>
                应用
              </Button>
            </div>
          }
        >
          <Button className="yk-advanced-value-editor__recent-trigger" style={{ flex: "0 0 auto" }}>
            最近 N 天
          </Button>
        </Popover>
      </>
    );
  } else if (props.fieldType === "date") {
    editor = (
      <DatePicker
        value={typeof raw === "string" ? dayjs(raw) : null}
        format={valueFormat}
        onChange={(_date, dateString) => emit(dateString || null)}
        placeholder="选择日期"
        allowClear
      />
    );
  } else if (props.fieldType === "boolean") {
    editor = (
      <Select
        value={boolValue as unknown as string | undefined}
        options={boolOptions.map((opt) => ({
          label: opt.label,
          value: opt.value as unknown as string | number,
        }))}
        onChange={(v: string | number) => emit(v as unknown as boolean)}
        placeholder="请选择"
        allowClear
      />
    );
  } else if (props.fieldType === "enum" && isMulti) {
    editor = (
      <Select
        mode="multiple"
        value={multiValue as (string | number)[]}
        options={selectOptions}
        onChange={(v: (string | number)[]) => emit(v)}
        placeholder="请选择"
        allowClear
        loading={props.optionsLoading}
      />
    );
  } else {
    editor = (
      <Select
        value={enumValue as unknown as string | number | undefined}
        options={selectOptions}
        onChange={(v: string | number) => emit(v ?? null)}
        placeholder="请选择"
        allowClear
        loading={props.optionsLoading}
      />
    );
  }

  const classes = [
    "yk-advanced-value-editor",
    isRange ? "yk-advanced-value-editor--range" : "",
    props.fieldType === "date" && isRange ? "yk-advanced-value-editor--daterange" : "",
    props.className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{editor}</div>;
}
