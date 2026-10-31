import { forwardRef, useReducer, type ReactNode } from "react";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import type { TableApi } from "@ys-knife-crud/core";
import "./tableActionMenuButton.css";

/**
 * YsTableActionMenuButton（React + antd）：表格操作菜单按钮（图标按钮 + 下拉菜单）。
 *
 * 把刷新 / 列设置 / 导出 / 视图切换 / 选择行 / 列宽拖动 / 锁定表头收敛到一个
 * 纯图标按钮，全部命令经 TableApi 驱动。菜单无状态——勾选标记每次打开时
 * 直接读 table 的当前状态，切换调对应 setter。
 *
 * Vue 的 #trigger 插槽对应 React 的 trigger prop。
 */
export interface YsTableActionMenuButtonProps {
  /** 当前表格实例（必填）：所有命令都经它调用 */
  table: TableApi;
  /** 自定义触发按钮（对应 Vue 的 #trigger 插槽）；缺省使用内置图标按钮 */
  trigger?: ReactNode;
  /** 追加到默认触发按钮上的类名 */
  className?: string;
}

function SlidersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <circle cx="9" cy="6" r="2.4" fill="#fff" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="15" cy="12" r="2.4" fill="#fff" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <circle cx="9" cy="18" r="2.4" fill="#fff" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="yk-table-action-menu-button__icon"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="yk-table-action-menu-button__icon"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ConfigIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="yk-table-action-menu-button__icon"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span className="yk-table-action-menu-button__check">
      {checked ? "✓" : ""}
    </span>
  );
}

export const YsTableActionMenuButton = forwardRef<
  HTMLButtonElement,
  YsTableActionMenuButtonProps
>(function YsTableActionMenuButton(
  { table, trigger, className },
  ref,
) {
  /** 菜单打开时强制重算一次，保证 ✓ 标记读到的都是 table 当前状态 */
  const [, bump] = useReducer((x: number) => x + 1, 0);

  function onCommand(command: string): void {
    switch (command) {
      case "refresh":
        table.refresh();
        break;
      case "config":
        table.openConfigDialog();
        break;
      case "export":
        table.openExportDialog();
        break;
      case "view-table":
        table.setViewMode("table");
        break;
      case "view-card":
        table.setViewMode("card");
        break;
      case "view-list":
        table.setViewMode("list");
        break;
      case "toggle-checkbox":
        table.setSelectable(!table.selectable);
        break;
      case "toggle-column-resize":
        table.setColumnResizable(!table.columnResizable);
        break;
      case "toggle-sticky-header":
        table.setStickyHeader(!table.stickyHeader);
        break;
    }
  }

  const items: MenuProps["items"] = [
    { key: "refresh", label: (<><RefreshIcon />刷新</>) },
    { key: "export", label: (<><ExportIcon />导出 Excel</>) },
    { key: "config", label: (<><ConfigIcon />列设置</>) },
    { type: "divider" },
    {
      key: "view-table",
      label: (<><CheckMark checked={table.viewMode === "table"} />表格视图</>),
    },
    ...(table.slotNames.includes("card")
      ? [{
          key: "view-card",
          label: (<><CheckMark checked={table.viewMode === "card"} />卡片视图</>),
        }]
      : []),
    ...(table.slotNames.includes("list")
      ? [{
          key: "view-list",
          label: (<><CheckMark checked={table.viewMode === "list"} />列表视图</>),
        }]
      : []),
    { type: "divider" },
    {
      key: "toggle-checkbox",
      label: (<><CheckMark checked={table.selectable} />选择行</>),
    },
    {
      key: "toggle-column-resize",
      label: (<><CheckMark checked={table.columnResizable} />列宽拖动</>),
    },
    {
      key: "toggle-sticky-header",
      label: (<><CheckMark checked={table.stickyHeader} />锁定表头</>),
    },
  ];

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      onOpenChange={(open) => {
        if (open) bump();
      }}
      menu={{ items, onClick: ({ key }) => onCommand(key) }}
    >
      {trigger ? (
        <span className="yk-table-action-menu-button__trigger">{trigger}</span>
      ) : (
        <Button
          ref={ref}
          className={`yk-table-action-menu-button__btn${className ? ` ${className}` : ""}`}
          title="表格操作"
          aria-label="表格操作"
        >
          <SlidersIcon />
        </Button>
      )}
    </Dropdown>
  );
});

YsTableActionMenuButton.displayName = "YsTableActionMenuButton";

export default YsTableActionMenuButton;
