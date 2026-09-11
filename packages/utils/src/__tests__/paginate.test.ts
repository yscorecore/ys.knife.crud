import { describe, expect, it } from "vitest";
import { paginate } from "../paginate";

describe("paginate", () => {
  const data = [1, 2, 3, 4, 5];

  it("returns first page by default", () => {
    const result = paginate(data, { pageSize: 2 });
    expect(result).toEqual({
      items: [1, 2],
      total: 5,
      page: 1,
      pageSize: 2,
      totalPages: 3,
    });
  });

  it("returns the requested page", () => {
    const result = paginate(data, { page: 2, pageSize: 2 });
    expect(result.items).toEqual([3, 4]);
    expect(result.page).toBe(2);
  });

  it("clamps page beyond the last page to the last page", () => {
    const result = paginate(data, { page: 99, pageSize: 2 });
    expect(result.page).toBe(3);
    expect(result.items).toEqual([5]);
  });

  it("clamps page smaller than 1 to page 1", () => {
    const result = paginate(data, { page: -3, pageSize: 2 });
    expect(result.page).toBe(1);
  });

  it("handles empty input", () => {
    const result = paginate([], { page: 1, pageSize: 10 });
    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });
});
