import type { ReactNode } from "react";
import type { MenuProps } from "antd";
import type { FunctionNode } from "@ys-knife-crud/core";

/**
 * YsMainPanel 功能树节点的菜单项转换：
 * - children 非空 → 带 children 的菜单项，antd 渲染为可展开 SubMenu（递归支持任意层级）
 * - 否则 → 普通菜单项叶子（点击由顶层 Menu 的 onClick 统一处理）
 * 折叠态由 antd 的 inlineCollapsed 自动隐藏文字、保留 icon。
 *
 * 用 antd 的 items 数据接口而非 Menu.Item/SubMenu JSX，保证 eventKey（即 node.key）
 * 由 antd 直接接管，避免自定义递归包装组件丢失 eventKey。
 */
export type YsMainPanelMenuItems = NonNullable<MenuProps["items"]>;

function menuIcon(node: FunctionNode): ReactNode | undefined {
  return node.icon ? (
    <i className="yk-main-panel__menu-icon">{node.icon}</i>
  ) : undefined;
}

/** 递归把 FunctionNode[] 转换成 antd Menu 的 items 数据 */
export function toMainPanelMenuItems(
  list: FunctionNode[],
): YsMainPanelMenuItems {
  const items: YsMainPanelMenuItems = [];
  for (const node of list) {
    const icon = menuIcon(node);
    const label = <span className="yk-main-panel__menu-text">{node.label}</span>;
    if (node.children && node.children.length > 0) {
      items.push({
        key: node.key,
        icon,
        label,
        children: toMainPanelMenuItems(node.children),
      });
    } else {
      items.push({ key: node.key, icon, label });
    }
  }
  return items;
}

export default toMainPanelMenuItems;
