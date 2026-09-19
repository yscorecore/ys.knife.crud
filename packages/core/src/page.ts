import type { PageFunc } from "ys.knife.query.js";

export type { PageFunc, PageReq } from "ys.knife.query.js";

export type ListFunc<T> = (signal?: AbortSignal) => Promise<T[]>;

export function constData<T>(values: T[]): PageFunc<T> {
    const defaultOffset = 0;
    const defaultLimit = 10;
    return ({ limit, offset }) => {
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

export function emptyData<T>(): PageFunc<T> {
    return constData<T>([]);
}

export function listData<T>(listFunc: ListFunc<T>): PageFunc<T> {
    return async (req, signal) => {
        const values = await listFunc(signal);
        return constData(values)(req);
    };
}
