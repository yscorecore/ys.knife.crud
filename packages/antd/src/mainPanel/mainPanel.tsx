import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Button, Empty, Input, Menu, Spin, Tabs } from "antd";
import type { MenuProps, TabsProps } from "antd";
import type {
  FunctionNodesFunc,
  MainPanelComponentMap,
} from "@ys-knife-crud/core";
import {
  collectGroupKeys,
  filterNodesByKeyword,
  findNode,
  isGroupNode,
  useMainPanelNodes,
  useMainPanelTabs,
} from "@ys-knife-crud/react";
import { toMainPanelMenuItems } from "./mainPanelMenuNode";
import "./mainPanel.css";

/**
 * YsMainPanel（React + antd）：左侧功能树 + 右侧主面板选项卡的管理后台布局骨架。
 *
 * 通用逻辑（功能树加载、选项卡状态、组件解析缓存）全部来自
 * @ys-knife-crud/react 的 useMainPanelNodes / useMainPanelTabs，本组件只负责
 * antd Menu / Tabs 视图编排与折叠态。
 */
export interface YsMainPanelProps {
  /** 功能树数据加载函数：异步返回功能树节点数组 */
  nodesFunc: FunctionNodesFunc;
  /** 组件路径 → 异步加载器映射（消费方 import.meta.glob 生成） */
  componentMap?: MainPanelComponentMap;
  /** 初始打开并激活的叶子节点 key（功能树加载完成后应用，仅首次生效） */
  defaultActive?: string;
  /** 是否渲染侧栏顶部内置的功能搜索框（默认 true） */
  showMenuSearch?: boolean;
  /** 功能搜索关键词（受控）；配合 onUpdateMenuKeyword 支持双向绑定 */
  menuKeyword?: string;
  /** 搜索关键词变化回调（对应 Vue 的 update:menuKeyword） */
  onUpdateMenuKeyword?: (keyword: string) => void;
  /** 当前激活选项卡变化回调（打开 / 切换 / 关闭联动） */
  onTabChange?: (activeKey: string) => void;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width="14"
      height="14"
      aria-hidden="true"
      className="yk-main-panel__search-icon"
    >
      <path
        fill="currentColor"
        d="M909.098 839.904l-181.22-181.248a341.5 341.5 0 1 0-47.734 48.58l180.56 180.588a33.92 33.92 0 0 0 48.394-47.92zM454.4 745.6a291.2 291.2 0 1 1 291.2-291.2 291.2 291.2 0 0 1-291.2 291.2z"
      />
    </svg>
  );
}

export function YsMainPanel({
  nodesFunc,
  componentMap,
  defaultActive = "",
  showMenuSearch = true,
  menuKeyword = "",
  onUpdateMenuKeyword,
  onTabChange,
}: YsMainPanelProps) {
  /* ---------------- 菜单折叠（视图层内部状态，非受控） ---------------- */
  const [collapsed, setCollapsed] = useState(false);

  /* ---------------- 功能搜索（内置 UI 可关；关键词受控 + 内部兜底） ---------------- */
  const [innerKeyword, setInnerKeyword] = useState(menuKeyword);
  useEffect(() => {
    setInnerKeyword(menuKeyword);
  }, [menuKeyword]);

  const handleKeywordChange = (value: string): void => {
    setInnerKeyword(value);
    onUpdateMenuKeyword?.(value);
  };

  const searching = innerKeyword.trim().length > 0;

  /* ---------------- 功能树加载 ---------------- */
  const { nodes, menuLoading } = useMainPanelNodes({ nodesFunc });

  /* ---------------- 选项卡状态与组件解析 ---------------- */
  const { openTabs, activeKey, setActiveKey, openTab, removeTab, getComponent } =
    useMainPanelTabs({ componentMap });

  const filteredNodes = useMemo(
    () => filterNodesByKeyword(nodes, innerKeyword),
    [nodes, innerKeyword],
  );
  const filteredGroupKeys = useMemo(
    () => collectGroupKeys(filteredNodes),
    [filteredNodes],
  );
  const menuItems = useMemo(() => toMainPanelMenuItems(nodes), [nodes]);
  const filteredMenuItems = useMemo(
    () => toMainPanelMenuItems(filteredNodes),
    [filteredNodes],
  );

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    const node = findNode(nodes, key);
    if (node && !isGroupNode(node)) openTab(node);
  };

  /* ---------------- 初始选项卡 ---------------- */

  /** 记录 useMainPanelNodes 首次加载完成（结果为新的数组引用） */
  const initialNodesRef = useRef(nodes);
  const loadedRef = useRef(false);
  const defaultAppliedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      if (nodes !== initialNodesRef.current) loadedRef.current = true;
      else return;
    }
    if (defaultAppliedRef.current) return;
    defaultAppliedRef.current = true;
    if (!defaultActive) return;
    const node = findNode(nodes, defaultActive);
    if (node && !isGroupNode(node)) openTab(node);
  }, [nodes, defaultActive, openTab]);

  /* ---------------- 激活选项卡变化回调 ---------------- */
  const prevActiveRef = useRef(activeKey);
  const onTabChangeRef = useRef(onTabChange);
  onTabChangeRef.current = onTabChange;
  useEffect(() => {
    if (prevActiveRef.current === activeKey) return;
    prevActiveRef.current = activeKey;
    onTabChangeRef.current?.(activeKey);
  }, [activeKey]);

  const tabItems: TabsProps["items"] = openTabs.map((tab) => {
    const Panel = (tab.componentPath ? getComponent(tab.componentPath) : null) as
      | ComponentType<Record<string, unknown>>
      | null;
    return {
      key: tab.key,
      label: tab.label,
      closable: true,
      forceRender: true,
      children: Panel ? (
        <Suspense fallback={<div className="yk-main-panel__loading"><Spin size="small" /></div>}>
          <Panel {...(tab.props ?? {})} />
        </Suspense>
      ) : null,
    };
  });

  const menuClassName = "yk-main-panel__menu";

  return (
    <div className="yk-main-panel">
      <aside className={`yk-main-panel__aside${collapsed ? " is-collapsed" : ""}`}>
        <div className="yk-main-panel__aside-header">
          <Button
            type="text"
            size="small"
            className="yk-main-panel__collapse-btn"
            title={collapsed ? "展开菜单" : "折叠菜单"}
            onClick={() => setCollapsed((v) => !v)}
          >
            ☰
          </Button>
          {showMenuSearch && !collapsed && (
            <Input
              className="yk-main-panel__aside-search"
              size="small"
              allowClear
              placeholder="搜索功能"
              aria-label="搜索功能"
              value={innerKeyword}
              prefix={<SearchIcon />}
              onChange={(e) => handleKeywordChange(e.target.value)}
            />
          )}
        </div>
        <div className="yk-main-panel__menu-wrap">
          <Spin spinning={menuLoading} size="small">
            {searching ? (
              <>
                <Menu
                  key={`search-${innerKeyword}`}
                  mode="inline"
                  className={menuClassName}
                  inlineCollapsed={collapsed}
                  items={filteredMenuItems}
                  selectedKeys={activeKey ? [activeKey] : []}
                  defaultOpenKeys={filteredGroupKeys}
                  onClick={handleMenuClick}
                />
                {filteredNodes.length === 0 && !menuLoading && (
                  <div className="yk-main-panel__menu-empty">未找到匹配的功能</div>
                )}
              </>
            ) : (
              <Menu
                key="full"
                mode="inline"
                className={menuClassName}
                inlineCollapsed={collapsed}
                items={menuItems}
                selectedKeys={activeKey ? [activeKey] : []}
                onClick={handleMenuClick}
              />
            )}
          </Spin>
        </div>
      </aside>

      <main className="yk-main-panel__main">
        {openTabs.length > 0 ? (
          <Tabs
            className="yk-main-panel__tabs"
            type="editable-card"
            hideAdd
            activeKey={activeKey}
            items={tabItems}
            onChange={(key) => setActiveKey(key)}
            onEdit={(key, action) => {
              if (action === "remove" && typeof key !== "object") removeTab(key);
            }}
          />
        ) : (
          <div className="yk-main-panel__empty">
            <Empty description="暂无打开的功能，从左侧菜单选择" />
          </div>
        )}
      </main>
    </div>
  );
}

export default YsMainPanel;
