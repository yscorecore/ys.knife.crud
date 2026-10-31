import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Button, Modal, Tag, Tooltip, message } from "antd";
import { con } from "ys.knife.query.js";
import {
  FilterInfo,
  Operator,
  emptyFilter,
  filter as filterFn,
  inferColumnFieldType,
  isConditionGroup,
  isMultiValueOperator,
  isNullOperator,
  isRangeOperator,
  type AdvancedCondition,
  type AdvancedConditionGroup,
  type AdvancedConditionNode,
  type AdvancedFieldType,
  type Column,
  type EnumOptionsSource,
} from "@ys-knife-crud/core";
import { YsAdvancedFilterPanel } from "../advancedFilter/advancedFilterPanel";
import type { AdvancedFilterPanelHandle } from "../advancedFilter/advancedFilterPanel";
import type { FilterInfoSnapshot, SavedQuery } from "../advancedFilter/advancedFilterContext";
import { YsRootFilterPanel } from "./rootFilterPanel";
import type { RootFilterPanelHandle } from "./rootFilterPanel";
import "./filterPanel.css";

/* --------------------- 按 group 重算 FilterInfo（快速查询加载用） --------------------- */
/* SavedQuery 只持久化 group，filterInfo 需按 advancedColumns 重新聚合。
   antd 版没有可独立驱动的 useAdvancedFilter 实例（React hook 只暴露状态只读视图），
   这里复用与 @ys-knife-crud/react 相同的纯聚合规则完成换算。 */

function makeFieldTypeOf(
  columns: Column[],
  optionSources?: Record<string, EnumOptionsSource>,
): (propertyPath: string) => AdvancedFieldType {
  const map = new Map<string, AdvancedFieldType>();
  for (const col of columns) {
    map.set(
      col.propertyPath,
      inferColumnFieldType(col, optionSources?.[col.propertyPath] !== undefined),
    );
  }
  return (propertyPath: string) => map.get(propertyPath) ?? "string";
}

function isConditionValueEmpty(
  row: AdvancedCondition,
  fieldTypeOf: (propertyPath: string) => AdvancedFieldType,
): boolean {
  if (isNullOperator(row.op)) return false;
  const type = fieldTypeOf(row.propertyPath);
  const v = row.value;
  if (isRangeOperator(row.op)) {
    if (!Array.isArray(v) || v.length !== 2) return true;
    return (
      v[0] === null ||
      v[0] === undefined ||
      v[0] === "" ||
      v[1] === null ||
      v[1] === undefined ||
      v[1] === ""
    );
  }
  if (isMultiValueOperator(row.op)) return !Array.isArray(v) || v.length === 0;
  if (type === "boolean" || type === "number" || type === "date") {
    return v === null || v === undefined || v === "";
  }
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function buildConditionFilter(
  row: AdvancedCondition,
  fieldTypeOf: (propertyPath: string) => AdvancedFieldType,
): FilterInfo | null {
  if (isConditionValueEmpty(row, fieldTypeOf)) return null;
  if (row.op === "is_null") {
    const type = fieldTypeOf(row.propertyPath);
    if (type === "string") {
      return FilterInfo.createOr(
        filterFn(row.propertyPath, Operator.Equals, con(null)) as unknown as FilterInfo,
        filterFn(row.propertyPath, Operator.Equals, con("")) as unknown as FilterInfo,
      ) as unknown as FilterInfo;
    }
    if (type === "array") {
      return FilterInfo.createOr(
        filterFn(row.propertyPath, Operator.Equals, con(null)) as unknown as FilterInfo,
        filterFn(`${row.propertyPath}.count`, Operator.Equals, con(0)) as unknown as FilterInfo,
      ) as unknown as FilterInfo;
    }
    return filterFn(
      row.propertyPath,
      Operator.Equals,
      con(null),
    ) as unknown as FilterInfo;
  }
  if (row.op === "is_not_null") {
    const type = fieldTypeOf(row.propertyPath);
    if (type === "string") {
      return FilterInfo.createAnd(
        filterFn(row.propertyPath, Operator.NotEquals, con(null)) as unknown as FilterInfo,
        filterFn(row.propertyPath, Operator.NotEquals, con("")) as unknown as FilterInfo,
      ) as unknown as FilterInfo;
    }
    if (type === "array") {
      return FilterInfo.createAnd(
        filterFn(row.propertyPath, Operator.NotEquals, con(null)) as unknown as FilterInfo,
        filterFn(`${row.propertyPath}.count`, Operator.GreaterThan, con(0)) as unknown as FilterInfo,
      ) as unknown as FilterInfo;
    }
    return filterFn(
      row.propertyPath,
      Operator.NotEquals,
      con(null),
    ) as unknown as FilterInfo;
  }
  return filterFn(
    row.propertyPath,
    row.op as Operator,
    con(row.value as unknown as (string | null)[]),
  ) as unknown as FilterInfo;
}

function buildNodeFilter(
  node: AdvancedConditionNode,
  fieldTypeOf: (propertyPath: string) => AdvancedFieldType,
): FilterInfo | null {
  if (isConditionGroup(node)) {
    const items = node.children
      .map((child) => buildNodeFilter(child, fieldTypeOf))
      .filter((f): f is FilterInfo => f !== null);
    if (items.length === 0) return null;
    if (items.length === 1) return items[0] as FilterInfo;
    if (node.combinator === "or") {
      return FilterInfo.createOr(...(items as unknown as FilterInfo[])) as unknown as FilterInfo;
    }
    return FilterInfo.createAnd(...(items as unknown as FilterInfo[])) as unknown as FilterInfo;
  }
  return buildConditionFilter(node, fieldTypeOf);
}

function recomputeFilterInfo(
  group: AdvancedConditionGroup,
  columns: Column[],
  optionSources?: Record<string, EnumOptionsSource>,
): FilterInfoSnapshot {
  const fieldTypeOf = makeFieldTypeOf(columns, optionSources);
  const result = buildNodeFilter(group, fieldTypeOf);
  return (result ?? emptyFilter()) as unknown as FilterInfoSnapshot;
}

/* -------------------------------- 组件 props -------------------------------- */
export interface FilterPanelProps {
  /** 是否渲染内置「查询」按钮，默认 true */
  showSearch?: boolean;
  /** 是否渲染内置「重置」按钮，默认 true */
  showReset?: boolean;
  /** 查询按钮文案，默认 "查询" */
  searchButtonText?: string;
  /** 重置按钮文案，默认 "重置" */
  resetButtonText?: string;
  /** 是否启用高级查询切换 */
  enableAdvancedFilter?: boolean;
  /** 高级查询模式所需的字段列表 */
  advancedColumns?: Column[];
  /** 高级查询模式所需的枚举数据源，按 propertyPath 映射 */
  advancedOptionSources?: Record<string, EnumOptionsSource>;
  /** 是否在简单模式下显示快速查询标签，默认 false */
  showQuickQuery?: boolean;
  /** 快速查询列表（替代 v-model:quick-queries） */
  quickQueries?: SavedQuery[];
  /** 异步加载快速查询列表 */
  loadQuickQueryFun?: () => Promise<SavedQuery[]>;
  /** 异步保存快速查询 */
  saveQuickQueryFun?: (query: SavedQuery) => Promise<void | SavedQuery>;
  /** 单行模式 */
  singleLine?: boolean;
  /** 默认插槽（filter items） */
  children?: ReactNode;
  /** 查询回调（替代 search 事件） */
  onSearch?: (filter: FilterInfo) => void;
  /** 重置回调（替代 reset 事件） */
  onReset?: () => void;
  /** 快速查询更新回调（替代 update:quick-queries 事件） */
  onUpdateQuickQueries?: (queries: SavedQuery[]) => void;
}

export type FilterPanelMode = "simple" | "advanced";

export interface FilterPanelHandle {
  readonly filter: FilterInfo;
  readonly mode: FilterPanelMode;
  reset(): void;
}

/**
 * YsFilterPanel：查询面板（antd 版）。
 *
 * - 子 YsFilterItem 经内置 YsRootFilterPanel 自动注册并 AND 聚合
 * - 内置「查询」「重置」按钮、回车查询、高级查询切换
 * - showQuickQuery 时显示快速查询标签（与高级面板的已存查询共享）
 * - singleLine 单行折叠：用 ref + ResizeObserver 测量并隐藏放不下的 item
 *   （隐藏项不清值，条件仍参与聚合）
 */
export const YsFilterPanel = forwardRef<FilterPanelHandle, FilterPanelProps>(
  function YsFilterPanel(props, ref) {
    const showSearch = props.showSearch ?? true;
    const showReset = props.showReset ?? true;
    const searchButtonText = props.searchButtonText ?? "查询";
    const resetButtonText = props.resetButtonText ?? "重置";
    const enableAdvancedFilter = props.enableAdvancedFilter ?? false;
    const advancedColumns = props.advancedColumns ?? [];
    const showQuickQuery = props.showQuickQuery ?? false;
    const singleLine = props.singleLine ?? false;

    const rootRef = useRef<RootFilterPanelHandle | null>(null);
    const advancedRef = useRef<AdvancedFilterPanelHandle | null>(null);

    const [mode, setMode] = useState<FilterPanelMode>("simple");
    const [collapsed, setCollapsed] = useState(true);
    const [hiddenCount, setHiddenCount] = useState(0);
    const itemsEl = useRef<HTMLDivElement | null>(null);

    const [internalQuickQueries, setInternalQuickQueries] = useState<SavedQuery[]>([]);
    const quickQueriesState: SavedQuery[] =
      props.quickQueries ?? internalQuickQueries;

    const currentFilter = (): FilterInfo => {
      if (mode === "advanced") {
        return advancedRef.current?.filter ?? (emptyFilter() as unknown as FilterInfo);
      }
      return rootRef.current?.filter ?? (emptyFilter() as unknown as FilterInfo);
    };

    const doSearch = (): void => props.onSearch?.(currentFilter());

    const doReset = (): void => {
      if (mode === "advanced") advancedRef.current?.reset();
      else rootRef.current?.reset();
      props.onReset?.();
    };

    useImperativeHandle(
      ref,
      () => ({
        get filter() {
          return currentFilter();
        },
        get mode() {
          return mode;
        },
        reset: doReset,
      }),
      [mode],
    );

    /* ---------------- 快速查询：加载 / 保存 / 删除 ---------------- */
    const commitQuickQueries = (queries: SavedQuery[]): void => {
      setInternalQuickQueries(queries);
      props.onUpdateQuickQueries?.(queries);
    };

    /** 高级面板 saved-queries 更新 → 检测新增项 → 持久化 → 写入列表 */
    const onSavedQueriesUpdate = async (queries: SavedQuery[]): Promise<void> => {
      const currentIds = new Set(quickQueriesState.map((q) => q.id));
      const newQueries = queries.filter((q) => !currentIds.has(q.id));

      if (props.saveQuickQueryFun && newQueries.length > 0) {
        const persisted: SavedQuery[] = [];
        for (const nq of newQueries) {
          try {
            const result = await props.saveQuickQueryFun(nq);
            persisted.push(result ?? nq);
          } catch {
            message.error(`保存快速查询「${nq.name}」失败`);
            persisted.push(nq);
          }
        }
        let result = queries;
        if (persisted.some((p, i) => p !== newQueries[i])) {
          const map = new Map(newQueries.map((nq, i) => [nq.id, persisted[i] ?? nq]));
          result = queries.map((q) => map.get(q.id) ?? q);
        }
        commitQuickQueries(result);
      } else {
        commitQuickQueries(queries);
      }
    };

    // 挂载时自动加载已存查询；后端返回的 filterInfo 缺失时按 group 重算。
    useEffect(() => {
      if (!props.loadQuickQueryFun) return;
      let cancelled = false;
      props
        .loadQuickQueryFun()
        .then((loaded) => {
          if (cancelled) return;
          const withFilterInfo = loaded.map((sq) => ({
            ...sq,
            filterInfo:
              sq.filterInfo ??
              recomputeFilterInfo(sq.group, advancedColumns, props.advancedOptionSources),
          }));
          setInternalQuickQueries(withFilterInfo);
          props.onUpdateQuickQueries?.(withFilterInfo);
        })
        .catch(() => {
          if (!cancelled) message.error("加载快速查询失败");
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyQuickQuery = (sq: SavedQuery): void => {
      if (mode === "advanced") {
        advancedRef.current?.applySavedQuery(sq);
      } else {
        props.onSearch?.(sq.filterInfo as unknown as FilterInfo);
      }
    };

    const removeQuickQuery = (id: string): void => {
      const target = quickQueriesState.find((sq) => sq.id === id);
      const name = target?.name ?? "该查询";
      Modal.confirm({
        title: "删除确认",
        content: `确定要删除快速查询「${name}」吗？`,
        okText: "删除",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: () => {
          void onSavedQueriesUpdate(quickQueriesState.filter((sq) => sq.id !== id));
        },
      });
    };

    /* ---------------- 单行模式折叠/展开与溢出测量 ---------------- */
    const measureAndHide = (): void => {
      const container = itemsEl.current;
      if (!container) return;

      for (const child of Array.from(container.children)) {
        (child as HTMLElement).style.display = "";
      }

      if (!singleLine || !collapsed) {
        setHiddenCount(0);
        container.style.maxWidth = "";
        return;
      }

      const actionsEl = container.nextElementSibling as HTMLElement | null;
      const actionsWidth = actionsEl ? actionsEl.offsetWidth : 0;
      const gap = 16;
      container.style.maxWidth = `calc(100% - ${actionsWidth + gap}px)`;
      const available = container.clientWidth;
      let accumulated = 0;
      let hidden = 0;

      for (const child of Array.from(container.children)) {
        const el = child as HTMLElement;
        const w = el.offsetWidth;
        if (accumulated > 0 && accumulated + w + gap > available) {
          el.style.display = "none";
          hidden++;
        } else {
          accumulated += w + gap;
        }
      }
      setHiddenCount(hidden);
    };

    useEffect(() => {
      measureAndHide();
      const container = itemsEl.current;
      if (!container) return;
      const observer = new ResizeObserver(() => measureAndHide());
      observer.observe(container);
      return () => observer.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [singleLine, collapsed, mode]);

    const toggleCollapse = (): void => setCollapsed((v) => !v);

    const searchIcon = collapsed ? (
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
        <polyline points="6 14 12 20 18 14" />
      </svg>
    ) : (
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
        <polyline points="18 10 12 4 6 10" />
      </svg>
    );

    return (
      <div
        className={[
          "yk-filter-panel",
          singleLine ? "is-single-line" : "",
          singleLine && collapsed ? "is-collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && mode === "simple") doSearch();
        }}
      >
        {mode === "simple" ? (
          <>
            {singleLine && (
              <Button
                type="text"
                className="yk-filter-panel__toggle"
                aria-label={collapsed ? "展开更多条件" : "折叠"}
                title={
                  collapsed
                    ? hiddenCount
                      ? `展开（${hiddenCount} 个条件被隐藏）`
                      : "展开"
                    : "折叠"
                }
                onClick={toggleCollapse}
              >
                {searchIcon}
              </Button>
            )}

            <div className="yk-filter-panel__items" ref={itemsEl}>
              <YsRootFilterPanel ref={rootRef}>{props.children}</YsRootFilterPanel>
            </div>

            {(showSearch || showReset || enableAdvancedFilter) && (
              <div className="yk-filter-panel__actions">
                {showSearch && (
                  <Button type="primary" onClick={doSearch}>
                    {searchButtonText}
                  </Button>
                )}
                {showReset && <Button onClick={doReset}>{resetButtonText}</Button>}
                {enableAdvancedFilter && !(singleLine && collapsed) && (
                  <Button type="link" onClick={() => setMode("advanced")}>
                    高级查询
                  </Button>
                )}
              </div>
            )}

            {showQuickQuery && quickQueriesState.length > 0 && (
              <div className="yk-filter-panel__saved">
                <span className="yk-filter-panel__saved-label">快速查询：</span>
                {quickQueriesState.map((sq) => (
                  <Tooltip key={sq.id} title={sq.description || undefined}>
                    <Button size="small" onClick={() => applyQuickQuery(sq)}>
                      {sq.name}
                    </Button>
                  </Tooltip>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="yk-filter-panel__mode-bar">
              <Button type="link" onClick={() => setMode("simple")}>
                &larr; 简单查询
              </Button>
            </div>

            <YsAdvancedFilterPanel
              ref={advancedRef}
              columns={advancedColumns}
              optionSources={props.advancedOptionSources}
              savedQueries={quickQueriesState}
              onSearch={(f) => props.onSearch?.(f)}
              onReset={() => props.onReset?.()}
              onUpdateSavedQueries={onSavedQueriesUpdate}
            />

            {quickQueriesState.length > 0 && (
              <div className="yk-filter-panel__saved">
                <span className="yk-filter-panel__saved-label">已存查询：</span>
                {quickQueriesState.map((sq) => (
                  <Tooltip key={sq.id} title={sq.description || undefined}>
                    <Tag
                      className="yk-filter-panel__saved-tag"
                      closable
                      onClick={() => applyQuickQuery(sq)}
                      onClose={() => removeQuickQuery(sq.id)}
                    >
                      {sq.name}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);
