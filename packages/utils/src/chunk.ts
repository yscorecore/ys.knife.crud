/**
 * 将数组按固定大小切分
 *
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(list: readonly T[], size: number): T[][] {
  if (!Number.isFinite(size) || size < 1) {
    throw new RangeError(`chunk(): size must be a positive integer, got ${size}`);
  }
  const result: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    result.push(list.slice(i, i + size));
  }
  return result;
}
