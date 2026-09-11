import { describe, expect, it } from "vitest";
import { chunk } from "../chunk";
import { uniqueBy } from "../unique-by";
import { deepClone } from "../deep-clone";

describe("chunk", () => {
  it("splits evenly", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it("keeps remainder in the last chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("throws on invalid size", () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });

  it("returns empty array for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("uniqueBy", () => {
  it("deduplicates by key keeping first occurrence", () => {
    const input = [
      { id: 1, name: "a" },
      { id: 1, name: "b" },
      { id: 2, name: "c" },
    ];
    expect(uniqueBy(input, (x) => x.id)).toEqual([
      { id: 1, name: "a" },
      { id: 2, name: "c" },
    ]);
  });
});

describe("deepClone", () => {
  it("clones nested structures without shared references", () => {
    const original = { list: [{ v: 1 }], meta: { ok: true } };
    const copy = deepClone(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    copy.list[0]!.v = 999;
    expect(original.list[0]!.v).toBe(1);
  });
});
