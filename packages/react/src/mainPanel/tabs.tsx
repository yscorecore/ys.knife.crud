import { lazy, useCallback, useRef, useState } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { FunctionNode, MainPanelProps } from "@ys-knife-crud/core";

/**
 * 主面板选项卡（运行时结构）。
 */
export interface MainPanelTab {
  /** 选项卡 key = 叶子节点 key */
  key: string;
  /** 选项卡文案（含 icon 前缀） */
  label: string;
  /** 要渲染的组件路径字符串（空表示叶子未声明 component） */
  componentPath: string;
  /** 渲染面板组件时透传的节点级 props */
  props: Record<string, unknown> | undefined;
}

export interface UseMainPanelTabsResult {
  openTabs: MainPanelTab[];
  activeKey: string;
  setActiveKey: (key: string) => void;
  openTab: (node: FunctionNode) => void;
  removeTab: (key: string | number) => void;
  getComponent: (path: string) => LazyExoticComponent<ComponentType> | null;
}

/**
 * 主面板选项卡逻辑：选项卡的打开（去重）、关闭联动、当前激活项，
 * 以及叶子节点组件路径的解析与缓存（React.lazy，按路径缓存）。
 */
export function useMainPanelTabs(
  props: Pick<MainPanelProps, "componentMap">,
): UseMainPanelTabsResult {
  const [openTabs, setOpenTabs] = useState<MainPanelTab[]>([]);
  const [activeKey, setActiveKey] = useState("");

  /** 组件解析缓存：路径 → 已包装的 React.lazy 组件 */
  const componentCache = useRef(new Map<string, LazyExoticComponent<ComponentType>>());
  const componentMapRef = useRef(props.componentMap);
  componentMapRef.current = props.componentMap;

  const getComponent = useCallback(
    (path: string): LazyExoticComponent<ComponentType> | null => {
      if (!path) return null;
      const cache = componentCache.current;
      if (!cache.has(path)) {
        const loader = componentMapRef.current?.[path];
        cache.set(
          path,
          lazy(
            loader
              ? async () => {
                  const m = (await loader()) as { default: ComponentType };
                  return { default: m.default };
                }
              : // 未提供 componentMap 时的兜底：运行时动态 import（跳过打包器静态分析）
                async () => {
                  const m = (await (Function("p", "return import(p)")(path) as Promise<{
                    default: ComponentType;
                  }>)) ;
                  return { default: m.default };
                },
          ),
        );
      }
      return cache.get(path) ?? null;
    },
    [],
  );

  const openTab = useCallback(
    (node: FunctionNode): void => {
      const label = (node.icon ? `${node.icon} ` : "") + node.label;
      setOpenTabs((prev) => {
        if (prev.some((tab) => tab.key === node.key)) return prev;
        return [
          ...prev,
          {
            key: node.key,
            label,
            componentPath: node.component ?? "",
            props: node.props,
          },
        ];
      });
      if (node.component) getComponent(node.component);
      setActiveKey(node.key);
    },
    [getComponent],
  );

  /** 关闭选项卡：关闭的是当前 tab 时激活相邻的 tab（优先右侧，否则左侧） */
  const removeTab = useCallback((key: string | number): void => {
    const target = String(key);
    setOpenTabs((prev) => {
      const index = prev.findIndex((tab) => tab.key === target);
      if (index < 0) return prev;
      const next = [...prev];
      next.splice(index, 1);
      setActiveKey((current) => {
        if (current !== target) return current;
        return next[Math.min(index, next.length - 1)]?.key ?? "";
      });
      return next;
    });
  }, []);

  return { openTabs, activeKey, setActiveKey, openTab, removeTab, getComponent };
}
