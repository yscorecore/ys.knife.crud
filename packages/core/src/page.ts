import type { PageFunc } from "ys.knife.query.js";

export type { PageFunc } from "ys.knife.query.js";

export type ListFunc<T> = (arg: Record<string, any>, signal?: AbortSignal) => Promise<T[]>;


export function constData(values: unknown[]): PageFunc<unknown> {
  return () => Promise.resolve({
    limit:values.length,
    offset:0,
    items:values
  }});
}


