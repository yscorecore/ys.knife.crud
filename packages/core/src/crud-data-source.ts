import type { CrudEntity, NewEntity, PatchEntity, QueryOptions, QueryResult } from "./types";

/**
 * CRUD 数据源契约。
 *
 * 任何后端（REST、GraphQL、IndexedDB、localStorage……）只要实现该接口，
 * 即可接入 CrudManager。
 */
export interface CrudDataSource<T extends CrudEntity> {
  readonly name: string;

  create(item: NewEntity<T>): Promise<T>;
  read(id: T["id"]): Promise<T | undefined>;
  update(id: T["id"], patch: PatchEntity<T>): Promise<T | undefined>;
  delete(id: T["id"]): Promise<boolean>;
  list(query?: QueryOptions): Promise<QueryResult<T>>;
}
