import { paginate } from "@ys.knife.crud/utils";
import type { CrudDataSource } from "./crud-data-source";
import type { CrudEntity, NewEntity, PatchEntity, QueryOptions, QueryResult } from "./types";

/**
 * 内存实现的数据源。
 *
 * 适合单测、Demo、本地缓存层；也可作为自定义数据源的参考实现。
 */
export class MemoryDataSource<T extends CrudEntity> implements CrudDataSource<T> {
  readonly name: string;
  private store: Map<T["id"], T>;
  private seq: number;

  constructor(name = "memory", initial: readonly T[] = []) {
    this.name = name;
    this.store = new Map(initial.map((item) => [item.id, item]));
    this.seq = initial.length;
  }

  async create(item: NewEntity<T>): Promise<T> {
    this.seq += 1;
    const entity = { ...item, id: this.seq } as T;
    this.store.set(entity.id, entity);
    return structuredClone(entity);
  }

  async read(id: T["id"]): Promise<T | undefined> {
    const found = this.store.get(id);
    return found === undefined ? undefined : structuredClone(found);
  }

  async update(id: T["id"], patch: PatchEntity<T>): Promise<T | undefined> {
    const current = this.store.get(id);
    if (current === undefined) return undefined;
    const next = { ...current, ...patch, id: current.id };
    this.store.set(id, next);
    return structuredClone(next);
  }

  async delete(id: T["id"]): Promise<boolean> {
    return this.store.delete(id);
  }

  async list(query: QueryOptions = {}): Promise<QueryResult<T>> {
    return paginate(Array.from(this.store.values()), query);
  }
}
