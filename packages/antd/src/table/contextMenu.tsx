import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Action } from "@ys-knife-crud/core";
import { renderIcon } from "../shared/icon";
import "./contextMenu.css";

/** 右键菜单状态：点击位置（视口坐标）与目标行 */
export interface YsContextMenuState {
  x: number;
  y: number;
  row: Record<string, unknown>;
}

/**
 * 右键上下文菜单：卡片/列表视图行操作入口。
 * portal 到 body 避免被容器裁切；透明遮罩捕获菜单外点击/右键以关闭；
 * Esc 关闭在本组件内监听（与 Vue 版 Table 的 onCardMenuKeydown 等价）。
 */
export interface YsContextMenuProps {
  menu: YsContextMenuState | null;
  actions: Action<unknown>[];
  isEnabled: (action: Action<unknown>, row: Record<string, unknown>) => boolean;
  onClose: () => void;
  onSelect: (action: Action<unknown>) => void;
}

export function YsContextMenu({ menu, actions, isEnabled, onClose, onSelect }: YsContextMenuProps) {
  useEffect(() => {
    if (!menu) return;
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [menu, onClose]);

  if (!menu || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="yk-table__menu-mask"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <ul className="yk-table__context-menu" style={{ left: menu.x, top: menu.y }}>
        {actions.map((action) => {
          const enabled = isEnabled(action, menu.row);
          return (
            <li
              key={action.name}
              className={`yk-table__context-menu-item${enabled ? "" : " is-disabled"}`}
              onClick={() => {
                if (enabled) onSelect(action);
              }}
            >
              {action.icon ? (
                <span className="yk-table__context-menu-icon">{renderIcon(action.icon)}</span>
              ) : null}
              {action.desc}
            </li>
          );
        })}
      </ul>
    </>,
    document.body,
  );
}
