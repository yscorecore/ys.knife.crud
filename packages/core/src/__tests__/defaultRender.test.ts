import { afterEach, describe, expect, it } from "vitest";
import {
  getCellRender,
  getDefaultRender,
  setDefaultRender,
  type Column,
} from "../meta";

afterEach(() => setDefaultRender(null));

describe("setDefaultRender", () => {
  it("未注册工厂且列无 render 时返回 null", () => {
    const column: Column = { propertyPath: "status" };
    expect(getDefaultRender(column)).toBeNull();
    expect(getCellRender(column)).toBeNull();
  });

  it("工厂接收当前列，返回的 render 参与展示并拿到 formattedValue 与 column", () => {
    const column: Column = { propertyPath: "status" };
    let receivedColumn: Column | undefined;
    setDefaultRender((current) => {
      receivedColumn = current;
      return (row, value, formattedValue, col) =>
        `[${(row as { status: number }).status}|${value}|${formattedValue}|${col.propertyPath}]`;
    });

    expect(getDefaultRender(column)).not.toBeNull();
    expect(receivedColumn).toBe(column);
    const render = getCellRender(column);
    expect(render?.({ status: 3 }, 3, "待审核", column)).toBe("[3|3|待审核|status]");
  });

  it("列 render 优先，存在时不调用工厂", () => {
    const column: Column = {
      propertyPath: "status",
      render: (_row, value) => `列:${value}`,
    };
    let calls = 0;
    setDefaultRender(() => {
      calls++;
      return (_row, value) => `默认:${value}`;
    });

    const render = getCellRender(column);
    expect(render?.({ status: 1 }, 1, 1, column)).toBe("列:1");
    expect(calls).toBe(0);
  });

  it("工厂可按列返回 null，使该列退回格式化值显示", () => {
    const status: Column = { propertyPath: "status" };
    const name: Column = { propertyPath: "name" };
    setDefaultRender((column) =>
      column === status ? (_row, _value, formattedValue) => `● ${formattedValue}` : null,
    );

    expect(getCellRender(status)?.({}, 1, "待审核", status)).toBe("● 待审核");
    expect(getCellRender(name)).toBeNull();
  });
});
