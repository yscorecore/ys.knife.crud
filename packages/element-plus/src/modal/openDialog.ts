import type { Component } from "vue";
import {
    type DialogOptions,
    type ModalAction,
    type ModalHandle,
} from "@ys-knife-crud/vue";
import { openModal } from "./openModal";

/**
 * openDialog：openModal 的简化封装，固定提供「取消 / 确定」两个底部按钮。
 *
 * ```ts
 * openDialog({
 *   title: "编辑用户",
 *   component: UserEditForm,
 *   props: { userId: 123 },
 *   onConfirm: async (_handle, form) => {
 *     // form 自动推断为 InstanceType<typeof UserEditForm>，无需断言、无需判空
 *     const ok = await form.validate().catch(() => false);
 *     if (!ok) return false;   // 校验失败不关闭
 *     await saveUser();
 *   },
 * });
 * ```
 *
 * - 取消按钮默认直接关闭弹窗
 * - 确定按钮执行 onConfirm；onConfirm 返回 false 时保持弹窗打开，其他情况关闭
 * - 底部按钮固定为「取消 / 确定」，如需自定义按钮请使用 openModal 的 actions
 */
export function openDialog<
    P extends Record<string, unknown> = Record<string, unknown>,
    C extends Component = Component,
>(options: DialogOptions<P, C>): ModalHandle {
    const {
        confirmText = "确定",
        cancelText = "取消",
        confirmType = "primary",
        onConfirm,
        ...rest
    } = options;

    const footerActions: ModalAction<C>[] = [
        { name: "cancel", desc: cancelText, execute: (handle) => handle.close() },
        {
            name: "confirm",
            desc: confirmText,
            type: confirmType,
            execute: async (handle, instance) => {
                if (!onConfirm) {
                    handle.close();
                    return;
                }
                const result = await onConfirm(handle, instance);
                // 返回 false 保持弹窗打开，其他值关闭
                if (result !== false) handle.close();
            },
        },
    ];

    return openModal({ ...rest, actions: footerActions });
}
