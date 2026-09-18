import { computed, ref, watch } from "vue";
import type {
  DefaultProps,
  Meta,
  PagedList,
} from "@ys.knife.crud/core";

/**
 * 表格的默认状态与数据加载逻辑：列元数据、分页数据、当前页行数据、
 * 两类加载态、当前页码，以及由 paged 派生的总条数、加载列元数据的动作。
 *
 * 刻意不处理任何依赖「当前生效每页条数」的逻辑：加载数据（loadData 的
 * offset/limit）、是否显示分页组件（showPagination 的阈值）、pageSize/dataFun
 * 变化时的重新加载——这些都依赖调用方视图层解析出的 innerPageSize（在
 * element-plus 适配层中是「列设置对话框保存的默认值 ?? props.pageSize」），
 * 留在调用方组件中，避免本 composable 耦合视图层的分页大小解析策略。
 *
 * 本 composable 只注册一个监听：props.metaFun 变化 → 重新加载 meta。
 *
 * @param props  含 metaFun（对齐 core 的 DefaultProps；其余成员本 composable 不直接消费）
 */
export function useDefault(props: DefaultProps) {
  /** 列元数据（metaFun 返回值；挂载前为 null） */
  const meta = ref<Meta | null>(null);

  /** 当前页数据（dataFun 返回值；挂载前为 null） */
  const paged = ref<PagedList<unknown> | null>(null);

  /** 列元数据加载态 */
  const metaLoading = ref(false);

  /** 数据加载态 */
  const dataLoading = ref(false);

  /** 当前页码（1 基），翻页时驱动 dataFun 的 offset */
  const currentPage = ref(1);

  /** 当前页行数据，来自 dataFun 返回的 PagedList.items（挂载前为空数组） */
  const rows = computed(
    () => (paged.value?.items ?? []) as Record<string, unknown>[],
  );

  /** 总条数：优先 totalCount，缺失时按当前页 items 估算（hasNext 表示至少还有一页） */
  const total = computed(() => {
    const p = paged.value;
    if (!p) return 0;
    if (p.totalCount != null) return p.totalCount;
    return p.offset + p.items.length + (p.hasNext ? 1 : 0);
  });

  /** 加载列元数据（metaFun）；进行中置 metaLoading */
  async function loadMeta(signal?: AbortSignal): Promise<void> {
    metaLoading.value = true;
    try {
      meta.value = await props.metaFun(signal);
    } finally {
      metaLoading.value = false;
    }
  }

  // metaFun 变化 → 重新加载列元数据
  watch(() => props.metaFun, () => loadMeta());

  return {
    meta,
    paged,
    rows,
    metaLoading,
    dataLoading,
    currentPage,
    total,
    loadMeta,
  };
}
