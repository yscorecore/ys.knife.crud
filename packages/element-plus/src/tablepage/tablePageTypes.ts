import type { FilterInfo, PagedList, PageReq } from "@ys.knife.crud/core";

/**
 * YsTablePage 的 dataFun 增强签名：相比 core 的 PageFunc 多一个 filter 参数。
 * YsTablePage 内部把当前 FilterInfo 绑定进该函数，适配成 PageFunc 喂给 YsTable，
 * 从而把 filterPanel 的查询条件自动接到 table 的数据加载——消费者只写这一个 dataFun，
 * 搜索 / 重置时 YsTablePage 自动回到第 1 页重新拉取。
 */
export type TablePageDataFun = (
  req: PageReq,
  filter: FilterInfo,
  signal?: AbortSignal,
) => Promise<PagedList<unknown>>;
