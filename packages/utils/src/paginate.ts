/**
 * 分页结果的标准结构
 */
export interface Paginated<T> {
  /** 当前页的数据 */
  items: T[];
  /** 总条数 */
  total: number;
  /** 当前页码（从 1 开始） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}

export interface PaginateOptions {
  /** 页码，从 1 开始，默认 1 */
  page?: number;
  /** 每页条数，默认 20 */
  pageSize?: number;
}

/**
 * 对数组进行内存分页
 *
 * @example
 * paginate([1, 2, 3, 4, 5], { page: 2, pageSize: 2 }) // { items: [3, 4], total: 5, ... }
 */
export function paginate<T>(list: readonly T[], options: PaginateOptions = {}): Paginated<T> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? 20));
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: list.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
