import type { DialogOptions, ModalAction, ModalHandle } from "@ys-knife-crud/react";
import { openModal } from "./openModal";

/**
 * openDialog：openModal 的简化封装，固定提供「取消 / 确定」两个底部按钮。
 *
 * - 取消按钮默认直接关闭弹窗
 * - 确定按钮执行 onConfirm；onConfirm 返回 false 时保持弹窗打开，其他情况关闭
 * - 底部按钮固定为「取消 / 确定」，如需自定义按钮请使用 openModal 的 actions
 */
export function openDialog(options: DialogOptions): ModalHandle {
  const {
    confirmText = "确定",
    cancelText = "取消",
    confirmType = "primary",
    onConfirm,
    ...rest
  } = options;

  const footerActions: ModalAction[] = [
    { name: "cancel", desc: cancelText, execute: (handle) => handle.close() },
    {
      name: "confirm",
      desc: confirmText,
      type: confirmType,
      execute: async (handle) => {
        if (!onConfirm) {
          handle.close();
          return;
        }
        const result = await onConfirm(handle);
        // 返回 false 保持弹窗打开，其他值关闭
        if (result !== false) handle.close();
      },
    },
  ];

  return openModal({ ...rest, actions: footerActions });
}
