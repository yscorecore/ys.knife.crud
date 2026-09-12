import { describe, expect, it } from "vitest";
import { constData, emptyData } from "../page";

describe("constData", () => {
  it("resolves all values as a single page", async () => {
    const func = constData<number>([1, 2, 3]);
    const page = await func({});
    expect(page.limit).toBe(3);
    expect(page.offset).toBe(0);
    expect(page.totalCount).toBe(3);
    expect(page.hasNext).toBe(false);
    expect(page.items).toEqual([1, 2, 3]);
  });

  it("returns the same array reference (no copy)", async () => {
    const values = [{ a: 1 }, { a: 2 }];
    const func = constData(values);
    const page = await func({});
    expect(page.items).toBe(values);
  });
});

describe("emptyData", () => {
  it("resolves an empty page", async () => {
    const func = emptyData<number>();
    const page = await func({});
    expect(page.limit).toBe(0);
    expect(page.totalCount).toBe(0);
    expect(page.hasNext).toBe(false);
    expect(page.items).toEqual([]);
  });
});
