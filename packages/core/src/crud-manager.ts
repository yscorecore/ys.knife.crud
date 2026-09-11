import type { CrudDataSource } from "./crud-data-source";
import type { CrudEntity, NewEntity, PatchEntity, QueryOptions, QueryResult } from "./types";

/**
 * CRUD 管理器：在数据源之上提供统一的门面 API。
 *
 * 上层代码只依赖 CrudManager，与具体数据源实现解耦。
 */
export class CrudManager<T extends CrudEntity> {
  constructor(private readonly dataSource: CrudDataSource<T>) {}

  get sourceName(): string {
    return this.dataSource.name;
  }

  create(item: NewEntity<T>): Promise<T> {
    return this.dataSource.create(item);
  }

  read(id: T["id"]): Promise<T | undefined> {
    return this.dataSource.read(id);
  }

  update(id: T["id"], patch: PatchEntity<T>): Promise<T | undefined> {
    return this.dataSource.update(id, patch);
  }

  delete(id: T["id"]): Promise<boolean> {
    return this.dataSource.delete(id);
  }

  list(query?: QueryOptions): Promise<QueryResult<T>> {
    return this.dataSource.list(query);
  }
}
