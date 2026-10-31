import { useCallback, useEffect, useRef, useState } from "react";
import type { FunctionNode, MainPanelProps } from "@ys-knife-crud/core";

/**
 * 分组节点判断：children 非空。纯函数。
 */
export function isGroupNode(node: FunctionNode): boolean {
  return !!(node.children && node.children.length > 0);
}

/** 深度优先查找节点（按 key）。纯函数。 */
export function findNode(list: FunctionNode[], key: string): FunctionNode | undefined {
  for (const node of list) {
    if (node.key === key) return node;
    const found = node.children ? findNode(node.children, key) : undefined;
    if (found) return found;
  }
  return undefined;
}

/** 收集功能树中所有分组节点的 key（深度优先）。纯函数。 */
export function collectGroupKeys(list: FunctionNode[]): string[] {
  const keys: string[] = [];
  for (const node of list) {
    if (isGroupNode(node)) {
      keys.push(node.key);
      keys.push(...collectGroupKeys(node.children!));
    }
  }
  return keys;
}

/**
 * 按关键词模糊过滤功能树（大小写不敏感，空白分词，全部 token 命中才算命中）。
 * 纯函数：不修改入参节点。
 */
export function filterNodesByKeyword(list: FunctionNode[], keyword: string): FunctionNode[] {
  const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return list;
  const matches = (label: string): boolean => {
    const text = label.toLowerCase();
    return tokens.every((t) => text.includes(t));
  };
  const walk = (nodes: FunctionNode[]): FunctionNode[] => {
    const result: FunctionNode[] = [];
    for (const node of nodes) {
      if (isGroupNode(node)) {
        if (matches(node.label)) {
          result.push(node);
          continue;
        }
        const children = walk(node.children!);
        if (children.length > 0) result.push({ ...node, children });
      } else if (matches(node.label)) {
        result.push(node);
      }
    }
    return result;
  };
  return walk(list);
}

export interface UseMainPanelNodesResult {
  nodes: FunctionNode[];
  menuLoading: boolean;
  loadNodes: () => Promise<void>;
}

/**
 * 主面板功能树加载逻辑：nodesFunc 变化时自动重新加载。
 */
export function useMainPanelNodes(
  props: Pick<MainPanelProps, "nodesFunc">,
): UseMainPanelNodesResult {
  const [nodes, setNodes] = useState<FunctionNode[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const nodesFuncRef = useRef(props.nodesFunc);
  nodesFuncRef.current = props.nodesFunc;

  const loadNodes = useCallback(async (): Promise<void> => {
    setMenuLoading(true);
    try {
      setNodes(await nodesFuncRef.current());
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNodes();
  }, [props.nodesFunc, loadNodes]);

  return { nodes, menuLoading, loadNodes };
}
