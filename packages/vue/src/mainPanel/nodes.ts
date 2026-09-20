import { ref, watch } from "vue";
import type { FunctionNode, MainPanelProps } from "@ys.knife.crud/core";

/**
 * 分组节点判断：children 非空。
 * 纯函数：不依赖 composable 内部状态，供主面板组件复用。
 */
export function isGroupNode(node: FunctionNode): boolean {
  return !!(node.children && node.children.length > 0);
}

/**
 * 深度优先查找节点（按 key）。
 * 纯函数：供主面板组件在菜单选择、初始激活时定位节点。
 */
export function findNode(list: FunctionNode[], key: string): FunctionNode | undefined {
  for (const node of list) {
    if (node.key === key) return node;
    const found = node.children ? findNode(node.children, key) : undefined;
    if (found) return found;
  }
  return undefined;
}

/**
 * 收集功能树中所有分组节点的 key（深度优先）。
 * 纯函数：搜索过滤后用于 el-menu 的 default-openeds，让命中分组一次性全部展开。
 */
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
 * 按关键词模糊过滤功能树：
 * - 匹配规则：关键词两端裁空白后按空白拆成多个 token（大小写不敏感），
 *   叶子 label 同时包含全部 token 才算命中；单个 token 时即「子串包含」
 * - 分组节点自身 label 命中时，保留其整棵子树；
 *   否则只要后代有命中，保留该分组作为祖先链（children 替换为过滤结果）
 * - 关键词为空时原样返回
 *
 * 纯函数：不修改入参节点（命中祖先链时浅拷贝分组节点挂接过滤后的 children）。
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
          result.push(node); // 分组自身命中：整组保留
          continue;
        }
        const children = walk(node.children!);
        if (children.length > 0) result.push({ ...node, children }); // 祖先链保留
      } else if (matches(node.label)) {
        result.push(node);
      }
    }
    return result;
  };
  return walk(list);
}

/**
 * 主面板功能树加载逻辑：功能树数据与加载态、加载动作，
 * 以及 nodesFunc 变化时自动重新加载。
 *
 * 刻意不处理 defaultActive（初始选项卡）：它依赖选项卡状态（tabs composable），
 * 由调用方组件在首次 loadNodes 完成后自行应用。
 *
 * @param props 组件 props（只需 nodesFunc）
 */
export function useMainPanelNodes(props: Pick<MainPanelProps, "nodesFunc">) {
  /** 功能树数据（nodesFunc 加载结果） */
  const nodes = ref<FunctionNode[]>([]);

  /** 功能树加载态：loadNodes 进行中为 true（含 watch 触发的内部调用） */
  const menuLoading = ref(false);

  /** 加载功能树；进行中置 menuLoading */
  async function loadNodes(): Promise<void> {
    menuLoading.value = true;
    try {
      nodes.value = await props.nodesFunc();
    } finally {
      menuLoading.value = false;
    }
  }

  // 外部 nodesFunc 变化时重新加载功能树（已打开选项卡由调用方保留）
  watch(() => props.nodesFunc, () => {
    void loadNodes();
  });

  return {
    nodes,
    menuLoading,
    loadNodes,
  };
}
