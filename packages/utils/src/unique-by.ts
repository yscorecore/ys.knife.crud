/**
 * 按 key 去重，保留第一次出现的元素
 *
 * @example
 * uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (x) => x.id) // [{ id: 1 }, { id: 2 }]
 */
export function uniqueBy<T>(list: readonly T[], key: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  const result: T[] = [];
  for (const item of list) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(item);
    }
  }
  return result;
}
