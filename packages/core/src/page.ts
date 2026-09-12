import type { PageFunc } from "ys.knife.query.js";

export type { PageFunc } from "ys.knife.query.js";

export type ListFunc<T> = (arg: Record<string, any>, signal?: AbortSignal) => Promise<T[]>;


export function constData<T>(values: T[]): PageFunc<T> {
  return () => Promise.resolve({
    limit: values.length,
    offset: 0,
    totalCount: values.length,
    hasNext: false,
    items: values,
  });
}

export function emptyData<T>(): PageFunc<T> {
  return constData<T>([]);
}


