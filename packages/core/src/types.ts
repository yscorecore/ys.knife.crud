import type { Paginated } from "@ys.knife.crud/utils";

/** 实体必须拥有的主键类型 */
export type CrudId = string | number;

/** 所有 CRUD 实体的最小约束：必须带主键 */
export interface CrudEntity {
  id: CrudId;
}

/** 查询选项 */
export interface QueryOptions {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

export type QueryResult<T> = Paginated<T>;

/** 新建实体（不含 id，由数据源负责生成） */
export type NewEntity<T extends CrudEntity> = Omit<T, "id">;

/** 部分更新 */
export type PatchEntity<T extends CrudEntity> = Partial<NewEntity<T>>;
