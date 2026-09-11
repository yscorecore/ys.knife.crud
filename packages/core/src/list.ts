

export type ListFunc<T> = (arg: Record<string, any>, signal?: AbortSignal) => Promise<T[]>;