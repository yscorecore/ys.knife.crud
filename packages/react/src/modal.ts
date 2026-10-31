import type { ComponentType, ReactNode } from "react";
import type { ActionType } from "@ys-knife-crud/core";

/**
 * 代码式弹窗的框架无关契约层（React 版）：
 * 只定义类型，不依赖任何 UI 组件库。具体弹窗外壳（antd Modal 等）
 * 与底部按钮的渲染由 @ys-knife-crud/antd 实现。
 *
 * 与 Vue 版的差异：Vue 通过 emit("close") 关闭弹窗；React 组件由 openModal
 * 自动注入 `onClose` prop，内容组件调用 props.onClose() 即关闭。
 */

/** openModal 返回的弹窗句柄 */
export interface ModalHandle {
  /** 关闭弹窗（走关闭动画，动画结束后销毁 DOM） */
  close: () => void;
  /** 切换最大化 / 还原（仅 maximizable 为 true 时有效果） */
  toggleMaximize: () => void;
  /** 当前是否处于最大化状态 */
  isMaximized: () => boolean;
  /** 获取内容组件实例（内容组件通过 ref 暴露的命令式句柄），挂载完成后可用 */
  getContentInstance: () => unknown;
}

/**
 * 弹窗底部动作按钮，结构与 core 的 TableAction 同构。
 */
export interface ModalAction {
  /** 动作标识，不显示在界面上 */
  name: string;
  /** 按钮文案，同时作为按钮 title 提示 */
  desc: string;
  /** 按钮图标（ReactNode） */
  icon?: ReactNode;
  /** 按钮类型（对应 antd Button type） */
  type?: ActionType;
  /**
   * 执行动作。需要关闭弹窗时显式调用 handle.close()。
   * 返回 Promise 期间该按钮自动 loading，其余按钮禁用、右上角关闭按钮隐藏。
   */
  execute(handle: ModalHandle): Promise<void> | void;
}

/** openModal 选项 */
export interface ModalOptions {
  /** 弹窗标题，默认 "" */
  title?: string;
  /** 弹窗宽度（透传 antd Modal width），默认 "500px" */
  width?: string | number;
  /** 弹窗固定高度；设置后内容区超出时在弹窗内纵向滚动 */
  height?: string | number;
  /** 弹窗内容组件 */
  component: ComponentType<Record<string, unknown>>;
  /**
   * 传给内容组件的 props；同时自动注入 onClose 监听器
   * （内容组件调用 props.onClose() 即关闭弹窗）。
   */
  props?: Record<string, unknown>;
  /** 底部动作按钮；不传或空数组则不渲染底部 */
  actions?: ModalAction[];
  /** 取消类关闭回调（右上角关闭按钮 / ESC / 遮罩） */
  onCancel?: () => void;
  /** 弹窗完全关闭后回调 */
  onClosed?: () => void;
  /** 点击遮罩是否关闭，默认 false */
  closeOnClickModal?: boolean;
  /** 按 ESC 是否关闭，默认 false */
  closeOnPressEscape?: boolean;
  /** 标题栏是否显示「最大化 / 还原」按钮，默认 false */
  maximizable?: boolean;
  /** 打开时即最大化，默认 false */
  defaultMaximized?: boolean;
}

/**
 * openDialog 选项：openModal 的简化封装，固定提供「取消 / 确定」两个底部按钮。
 */
export interface DialogOptions extends Omit<ModalOptions, "actions"> {
  /** 确定按钮文案，默认 "确定" */
  confirmText?: string;
  /** 取消按钮文案，默认 "取消" */
  cancelText?: string;
  /** 确定按钮类型，默认 "primary" */
  confirmType?: ActionType;
  /**
   * 点击「确定」的回调，支持异步：执行期间确定按钮 loading、取消按钮与关闭按钮禁用。
   * 返回 false 表示校验未通过、弹窗不关闭；其他返回值（含 undefined）则关闭。
   */
  onConfirm?: (handle: ModalHandle) => unknown | Promise<unknown>;
}
