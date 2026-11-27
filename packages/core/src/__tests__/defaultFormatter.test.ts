import { afterEach, describe, expect, it } from "vitest";
import {
  formatCellValue,
  getDefaultFormatter,
  setDefaultFormatter,
  type Column,
} from "../meta";

afterEach(() => setDefaultFormatter(null));

describe("formatCellValue 默认 formatter 工厂", () => {
  it("未注册工厂时返回原值", () => {
    const column: Column = { propertyPath: "status" };
    expect(getDefaultFormatter(column)).toBeNull();
    expect(formatCellValue(column, { status: 1 })).toBe(1);
  });

  it("工厂接收当前列；列 formatter 存在时不调用工厂", () => {
    const column: Column = { propertyPath: "status" };
    let calls = 0;
    setDefaultFormatter((current) => {
      calls++;
      expect(current).toBe(column);
      return (_row, value) => `默认:${value}`;
    });

    expect(formatCellValue(column, { status: 1 })).toBe("默认:1");
    expect(calls).toBe(1);

    const custom: Column = { ...column, formatter: (_row, value) => `列:${value}` };
    expect(formatCellValue(custom, { status: 2 })).toBe("列:2");
    expect(calls).toBe(1);
  });

  it("工厂可按列返回 null，使该列保持原值", () => {
    const status: Column = { propertyPath: "status" };
    const name: Column = { propertyPath: "name" };
    setDefaultFormatter((column) =>
      column === status ? (_row, value) => `状态:${value}` : null,
    );

    expect(formatCellValue(status, { status: 1 })).toBe("状态:1");
    expect(getDefaultFormatter(name)).toBeNull();
    expect(formatCellValue(name, { name: "Alice" })).toBe("Alice");
  });
});
