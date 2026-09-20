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
