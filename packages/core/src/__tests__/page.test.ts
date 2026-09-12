import { describe, expect, it } from "vitest";
import { constData, emptyData, listData } from "../page";

describe("constData", () => {
  it("resolves the first page with default limit 10", async () => {
    const func = constData<number>([1, 2, 3]);
    const page = await func({});
    expect(page.limit).toBe(10);
    expect(page.offset).toBe(0);
    expect(page.totalCount).toBe(3);
    expect(page.hasNext).toBe(false);
    expect(page.items).toEqual([1, 2, 3]);
  });

  it("slices items by limit and offset", async () => {
    const func = constData<number>([1, 2, 3, 4, 5]);
    const page = await func({ limit: 2, offset: 2 });
    expect(page.limit).toBe(2);
    expect(page.offset).toBe(2);
    expect(page.totalCount).toBe(5);
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([3, 4]);
  });

  it("reports hasNext false on the last page", async () => {
    const func = constData<number>([1, 2, 3]);
    const page = await func({ limit: 2, offset: 2 });
    expect(page.hasNext).toBe(false);
    expect(page.items).toEqual([3]);
  });
});

describe("emptyData", () => {
  it("resolves an empty page", async () => {
    const func = emptyData<number>();
    const page = await func({});
    expect(page.limit).toBe(10);
    expect(page.totalCount).toBe(0);
    expect(page.hasNext).toBe(false);
    expect(page.items).toEqual([]);
  });
});

describe("listData", () => {
  it("wraps a ListFunc into a PageFunc with pagination", async () => {
    const func = listData<number>(() => Promise.resolve([1, 2, 3, 4, 5]));
    const page = await func({ limit: 2, offset: 0 });
    expect(page.totalCount).toBe(5);
    expect(page.hasNext).toBe(true);
    expect(page.items).toEqual([1, 2]);
  });

  it("fetches the list on every invocation", async () => {
    const values = [1];
    const func = listData<number>(() => Promise.resolve(values));
    await func({});
    values.push(2);
    const page = await func({});
    expect(page.totalCount).toBe(2);
    expect(page.items).toEqual([1, 2]);
  });
});
