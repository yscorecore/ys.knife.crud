import type { PageFunc, PageReq } from "ys.knife.query.js";

export type { PageFunc } from "ys.knife.query.js";

export type ListFunc<T> = (signal?: AbortSignal) => Promise<T[]>;


export function constData<T>(values: T[]): PageFunc<T> {
    const defaultOffset = 0;
    const defaultLimit = 10;
    return (req: PageReq) => {
        const offset = Math.max(0, req.offset ?? defaultOffset);
        const limit = Math.max(0, req.limit ?? defaultLimit);
        return Promise.resolve({
            limit,
            offset,
            totalCount: values.length,
            hasNext: offset + limit < values.length,
            items: values.slice(offset, offset + limit),
        });
    };
}

export function emptyData<T>(): PageFunc<T> {
    return constData<T>([]);
}

export function listData<T>(listFunc: ListFunc<T>): PageFunc<T> {
    return async (req: PageReq) => {
        const values = await listFunc();
        return constData(values)(req);
    };
}
