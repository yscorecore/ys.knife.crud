import type { ButtonProps } from "antd";
import type { ActionType } from "@ys-knife-crud/core";

/**
 * 把 core 的 ActionType（element-plus 语义）映射为 antd Button 的 type/danger。
 * primary → primary；danger → primary + danger（plain 时为 default + danger）；
 * 其余（success/warning/info/default）→ default。
 */
export function toButtonProps(
  type?: ActionType,
  plain?: boolean,
): Pick<ButtonProps, "type" | "danger"> {
  if (type === "danger") {
    return { type: plain ? "default" : "primary", danger: true };
  }
  if (type === "primary") {
    return { type: "primary" };
  }
  return { type: "default" };
}
