import type { PagedList } from "ys.knife.query.js";

export type { PageFunc } from "ys.knife.query.js";

export type ListFunc<T> = (signal?: AbortSignal) => Promise<T[]>;

export type NewPageFunc<T> = (limit: number, offset?: number, signal?: AbortSignal) => Promise<PagedList<T>>;

export function constData<T>(values: T[]): NewPageFunc<T> {
    const defaultOffset = 0;
    const defaultLimit = 10;
    return (limit: number, offset?: number) => {
         const o = Math.max(0, offset ?? defaultOffset);
         const l = Math.max(0, limit ?? defaultLimit);
        return Promise.resolve({
            limit: l,
            offset: o,
            totalCount: values.length,
            hasNext: o + l < values.length,
            items: values.slice(o, o + l),
        });
    };
}

export function emptyData<T>(): NewPageFunc<T> {
    return constData<T>([]);
}

export function listData<T>(listFunc: ListFunc<T>): NewPageFunc<T> {
    return async (limit: number, offset?: number, signal?: AbortSignal) => {
        const values = await listFunc(signal);
        return constData(values)(limit, offset);
    };
}
