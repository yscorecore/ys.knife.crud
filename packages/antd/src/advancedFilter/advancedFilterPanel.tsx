import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button, Input, Modal, message } from "antd";
import {
  isConditionGroup,
  type AdvancedCondition,
  type AdvancedConditionGroup,
  type AdvancedConditionNode,
  type Column,
  type EnumOption,
  type EnumOptionsSource,
  type FilterInfo,
} from "@ys-knife-crud/core";
import { useAdvancedFilter } from "@ys-knife-crud/react";
import { YsAdvancedConditionGroup } from "./advancedConditionGroup";
import { ADVANCED_FILTER_CONTEXT } from "./advancedFilterContext";
import type { AdvancedFilterContext, SavedQuery } from "./advancedFilterContext";
import "./advancedFilterPanel.css";

export interface AdvancedFilterPanelProps {
  /** 可供查询的字段列表（通常直接传 Meta.columns） */
  columns: Column[];
  /** 枚举字段数据源，按 propertyPath 映射；命中的字段按 enum 渲染 */
  optionSources?: Record<string, EnumOptionsSource>;
  /** 是否渲染内置「查询」按钮，默认 true */
  showSearch?: boolean;
  /** 是否渲染内置「重置」按钮，默认 true */
  showReset?: boolean;
  /** 查询按钮文案，默认 "查询" */
  searchButtonText?: string;
  /** 重置按钮文案，默认 "重置" */
  resetButtonText?: string;
  /** 是否渲染内置「保存」按钮，默认 true */
  showSaveQuery?: boolean;
  /** 已存查询列表；不传则用内部状态 */
  savedQueries?: SavedQuery[];
  /** 查询回调（替代 Vue 的 search 事件） */
  onSearch?: (filter: FilterInfo) => void;
  /** 重置回调（替代 Vue 的 reset 事件） */
  onReset?: () => void;
  /** 已存查询更新回调（替代 Vue 的 update:saved-queries 事件） */
  onUpdateSavedQueries?: (queries: SavedQuery[]) => void;
}

/** 暴露给父组件的方法（与 Vue 版 defineExpose 一致） */
export interface AdvancedFilterPanelHandle {
  readonly filter: FilterInfo;
  reset(): void;
  openSaveDialog(): void;
  applySavedQuery(sq: SavedQuery): void;
  removeSavedQuery(id: string): void;
  readonly savedQueries: SavedQuery[];
}

/** 递归就地修改叶子节点的值；返回是否命中 */
function mutateLeafValue(
  group: AdvancedConditionGroup,
  id: string,
  value: unknown,
): boolean {
  for (const child of group.children) {
    if (isConditionGroup(child)) {
      if (mutateLeafValue(child, id, value)) return true;
    } else if (child.id === id) {
      child.value = value;
      return true;
    }
  }
  return false;
}

/**
 * YsAdvancedFilterPanel：高级查询面板（antd 版）。
 *
 * 使用 useAdvancedFilter 管理树形条件（任意深度 AND/OR 嵌套），
 * YsAdvancedConditionGroup 递归渲染；本组件负责顶层 context、enum 选项加载、
 * 查询/重置/保存以及已存查询的保存/应用/删除。
 */
export const YsAdvancedFilterPanel = forwardRef<
  AdvancedFilterPanelHandle,
  AdvancedFilterPanelProps
>(function YsAdvancedFilterPanel(props, ref) {
  const showSearch = props.showSearch ?? true;
  const showReset = props.showReset ?? true;
  const searchButtonText = props.searchButtonText ?? "查询";
  const resetButtonText = props.resetButtonText ?? "重置";
  const showSaveQuery = props.showSaveQuery ?? true;

  const advApi = useAdvancedFilter({
    columns: props.columns,
    optionSources: props.optionSources,
  });
  const { rootGroup, fieldTypeOf, filter: filterInfo, reset } = advApi;

  /* ---- enum 选项按需加载：字段被选中且类型为 enum 时加载对应数据源一次 ---- */
  const [optionsMap, setOptionsMap] = useState<Record<string, EnumOption[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const optionsRef = useRef<Record<string, EnumOption[]>>({});
  const loadingRef = useRef<Record<string, boolean>>({});

  const ensureOptions = (propertyPath: string): void => {
    const src = props.optionSources?.[propertyPath];
    if (!src) return;
    if (optionsRef.current[propertyPath] || loadingRef.current[propertyPath]) return;
    loadingRef.current = { ...loadingRef.current, [propertyPath]: true };
    setLoadingMap(loadingRef.current);
    src()
      .then((opts) => {
        optionsRef.current = { ...optionsRef.current, [propertyPath]: opts };
        setOptionsMap(optionsRef.current);
      })
      .finally(() => {
        loadingRef.current = { ...loadingRef.current, [propertyPath]: false };
        setLoadingMap(loadingRef.current);
      });
  };

  /** 递归遍历条件树，收集所有 enum 字段的 propertyPath */
  const collectEnumPaths = (group: AdvancedConditionGroup): string[] => {
    const paths = new Set<string>();
    const walk = (node: AdvancedConditionNode): void => {
      if (isConditionGroup(node)) {
        node.children.forEach(walk);
      } else if (fieldTypeOf(node.propertyPath) === "enum") {
        paths.add(node.propertyPath);
      }
    };
    group.children.forEach(walk);
    return [...paths];
  };

  useEffect(() => {
    for (const path of collectEnumPaths(rootGroup)) ensureOptions(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootGroup, fieldTypeOf, props.optionSources]);

  /**
   * 更新叶子值。@ys-knife-crud/react 的 useAdvancedFilter 未暴露值 setter，
   * 这里就地写入叶子后借 setGroupCombinator 生成新的根对象，驱动重渲染与 filter 重算。
   */
  const updateValue = (id: string, value: unknown): void => {
    mutateLeafValue(rootGroup, id, value);
    advApi.setGroupCombinator(rootGroup.id, rootGroup.combinator);
  };

  /* ----------------------- 保存查询（预设） ----------------------- */
  const [internalSavedQueries, setInternalSavedQueries] = useState<SavedQuery[]>([]);
  const savedQueriesState = props.savedQueries ?? internalSavedQueries;

  const commitSavedQueries = (queries: SavedQuery[]): void => {
    setInternalSavedQueries(queries);
    props.onUpdateSavedQueries?.(queries);
  };

  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [saveQueryDesc, setSaveQueryDesc] = useState("");
  const savedSeqRef = useRef(0);

  /** 递归检查条件树中是否存在未填值的叶子 */
  const hasInvalidConditions = (): boolean => {
    const walk = (group: AdvancedConditionGroup): boolean =>
      group.children.some((child) => {
        if (isConditionGroup(child)) return walk(child);
        return advApi.isConditionEmpty(child as AdvancedCondition);
      });
    return walk(rootGroup);
  };

  const openSaveDialog = (): void => {
    setSaveQueryName("");
    setSaveQueryDesc("");
    setSaveDialogVisible(true);
  };

  /** 确认保存：检查报红→提示；深拷贝当前 rootGroup + filterInfo 快照，加入列表 */
  const confirmSaveQuery = (): void => {
    const name = saveQueryName.trim();
    if (!name) return;
    if (hasInvalidConditions()) {
      message.warning("当前存在未填值的条件行（标红），保存的预设可能不完整");
    }
    const snapshot = JSON.parse(JSON.stringify(rootGroup)) as AdvancedConditionGroup;
    const newQuery: SavedQuery = {
      id: `sq-${++savedSeqRef.current}`,
      name,
      description: saveQueryDesc.trim(),
      group: snapshot,
      filterInfo: filterInfo as unknown as SavedQuery["filterInfo"],
    };
    commitSavedQueries([...savedQueriesState, newQuery]);
    setSaveDialogVisible(false);
  };

  /** 应用后待触发的查询（React 需等重新渲染拿到新 filter 后再 emit） */
  const pendingSearchRef = useRef(false);
  const [searchToken, setSearchToken] = useState(0);

  /** 应用已存查询：深拷贝保存的 group 覆盖 rootGroup，并触发查询 */
  const applySavedQuery = (sq: SavedQuery): void => {
    const target = JSON.parse(JSON.stringify(sq.group)) as AdvancedConditionGroup;
    Object.assign(rootGroup, target);
    advApi.setGroupCombinator(rootGroup.id, rootGroup.combinator);
    pendingSearchRef.current = true;
    setSearchToken((n) => n + 1);
  };

  useEffect(() => {
    if (!pendingSearchRef.current) return;
    pendingSearchRef.current = false;
    props.onSearch?.(filterInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchToken, filterInfo]);

  /** 删除已存查询 */
  const removeSavedQuery = (id: string): void => {
    commitSavedQueries(savedQueriesState.filter((sq) => sq.id !== id));
  };

  const onSearch = (): void => props.onSearch?.(filterInfo);

  const onReset = (): void => {
    reset();
    props.onReset?.();
  };

  useImperativeHandle(
    ref,
    () => ({
      get filter() {
        return filterInfo;
      },
      reset: onReset,
      openSaveDialog,
      applySavedQuery,
      removeSavedQuery,
      get savedQueries() {
        return savedQueriesState;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterInfo, savedQueriesState, rootGroup],
  );

  const contextValue: AdvancedFilterContext = {
    columns: props.columns,
    optionsMap,
    loadingMap,
    api: advApi,
    updateValue,
  };

  return (
    <div
      className="yk-advanced-filter"
      onKeyDown={(e) => {
        if (e.key === "Enter") onSearch();
      }}
    >
      <YsAdvancedConditionGroup group={rootGroup} level={0} />

      {(showSearch || showReset || showSaveQuery) && (
        <div className="yk-advanced-filter__actions">
          {showSearch && (
            <Button type="primary" onClick={onSearch}>
              {searchButtonText}
            </Button>
          )}
          {showReset && <Button onClick={onReset}>{resetButtonText}</Button>}
          {showSaveQuery && <Button onClick={openSaveDialog}>保存</Button>}
        </div>
      )}

      <Modal
        open={saveDialogVisible}
        title="保存查询"
        width={440}
        onCancel={() => setSaveDialogVisible(false)}
        onOk={confirmSaveQuery}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ disabled: !saveQueryName.trim() }}
      >
        <div className="yk-advanced-filter__form-item">
          <label className="yk-advanced-filter__form-label">名称</label>
          <Input
            value={saveQueryName}
            onChange={(e) => setSaveQueryName(e.target.value)}
            placeholder="请输入查询名称"
            maxLength={50}
            showCount
            onPressEnter={confirmSaveQuery}
          />
        </div>
        <div className="yk-advanced-filter__form-item">
          <label className="yk-advanced-filter__form-label">描述</label>
          <Input.TextArea
            value={saveQueryDesc}
            onChange={(e) => setSaveQueryDesc(e.target.value)}
            rows={2}
            placeholder="可选，描述此查询的用途（hover 标签时显示）"
            maxLength={200}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
});
