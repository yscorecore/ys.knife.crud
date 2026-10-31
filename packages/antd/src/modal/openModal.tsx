import { Button, Modal } from "antd";
import { createElement, forwardRef, useImperativeHandle, useState } from "react";
import type {
  CSSProperties,
  ComponentType,
  MutableRefObject,
  ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import type { ModalAction, ModalHandle, ModalOptions } from "@ys-knife-crud/react";
import { toButtonProps } from "../shared/button";
import { renderIcon } from "../shared/icon";
import "./openModal.css";

/**
 * 代码式弹窗服务（antd 适配层）。
 *
 * 类型契约来自 @ys-knife-crud/react 的 modal.ts；本文件只负责用 antd Modal
 * 实现外壳渲染、底部按钮渲染与最大化能力。
 *
 * 典型用法：
 * ```tsx
 * openModal({
 *   title: "编辑用户",
 *   component: UserEditForm,
 *   props: { userId: 123 },
 *   actions: [
 *     { name: "cancel", desc: "取消", execute: (handle) => handle.close() },
 *     {
 *       name: "save",
 *       desc: "保存",
 *       type: "primary",
 *       execute: async (handle) => {
 *         await saveUser();
 *         handle.close();
 *       },
 *     },
 *   ],
 * });
 * ```
 *
 * 内容组件会被注入 onClose prop：调用 props.onClose() 即可关闭弹窗。
 */

interface ModalHostHandle {
  close: () => void;
  toggleMaximize: () => void;
  isMaximized: () => boolean;
}

interface ModalHostProps {
  title: string;
  width: string | number;
  heightValue?: string;
  component: ComponentType<Record<string, unknown>>;
  componentProps?: Record<string, unknown>;
  actions?: ModalAction[];
  onCancel?: () => void;
  onClosed?: () => void;
  closeOnClickModal: boolean;
  closeOnPressEscape: boolean;
  maximizable: boolean;
  defaultMaximized: boolean;
  contentRef: MutableRefObject<unknown>;
  modalHandle: ModalHandle;
  destroy: () => void;
}

/** 最大化图标（单框） */
function MaximizeIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

/** 还原图标（双框交叠） */
function RestoreIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

/** 内部宿主：持有 open / pendingIndex / maximized 等响应式状态 */
const YsModalHost = forwardRef<ModalHostHandle, ModalHostProps>(
  function YsModalHost(props, ref) {
    const {
      title,
      width,
      heightValue,
      component,
      componentProps,
      actions,
      onCancel,
      onClosed,
      closeOnClickModal,
      closeOnPressEscape,
      maximizable,
      defaultMaximized,
      contentRef,
      modalHandle,
      destroy,
    } = props;

    const [open, setOpen] = useState(true);
    // 正在执行的 actions 下标（-1 = 空闲）：执行中该按钮 loading、
    // 其余按钮禁用、右上角 ✕ 隐藏，与 Vue 版的异步提交体验保持一致
    const [pendingIndex, setPendingIndex] = useState(-1);
    const [maximized, setMaximized] = useState(maximizable && defaultMaximized);

    const toggleMaximize = (): void => {
      if (maximizable) setMaximized((value) => !value);
    };

    /** 主动关闭（动作内 handle.close() / 内容组件 onClose / 外部 handle.close） */
    const close = (): void => {
      setOpen(false);
    };

    /** 取消类关闭：✕ / ESC / 遮罩 */
    const cancelClose = (): void => {
      if (pendingIndex >= 0) return; // 动作执行中，忽略取消
      onCancel?.();
      setOpen(false);
    };

    /** 执行底部动作：执行中忽略重复点击，Promise 结束后解除 loading */
    const runAction = async (action: ModalAction, index: number): Promise<void> => {
      if (pendingIndex >= 0) return;
      setPendingIndex(index);
      try {
        await action.execute(modalHandle);
      } finally {
        setPendingIndex(-1);
      }
    };

    useImperativeHandle(ref, () => ({
      close,
      toggleMaximize,
      isMaximized: () => maximized,
    }), [maximizable, maximized]);

    const titleNode = maximizable ? (
      <div className="yk-modal__title-row">
        <span className="yk-modal__title-text">{title}</span>
        <Button
          type="text"
          size="small"
          className="yk-modal__maximize"
          title={maximized ? "还原" : "最大化"}
          aria-label={maximized ? "还原" : "最大化"}
          onClick={toggleMaximize}
        >
          {maximized ? <RestoreIcon /> : <MaximizeIcon />}
        </Button>
      </div>
    ) : (
      title
    );

    const footer = actions && actions.length > 0 ? (
      <div className="yk-modal__footer">
        {actions.map((action, index) => {
          const { type, danger } = toButtonProps(action.type);
          return (
            <Button
              key={action.name}
              type={type}
              danger={danger}
              title={action.desc}
              disabled={pendingIndex >= 0 && pendingIndex !== index}
              loading={pendingIndex === index}
              onClick={() => void runAction(action, index)}
              icon={
                action.icon ? (
                  <span className="yk-modal__action-icon">
                    {renderIcon(action.icon)}
                  </span>
                ) : undefined
              }
            >
              {action.desc}
            </Button>
          );
        })}
      </div>
    ) : null;

    const modalStyle = {
      ...(maximized ? { top: 0 } : {}),
      ...(heightValue && !maximized
        ? ({ "--yk-modal-height": heightValue } as Record<string, string>)
        : {}),
    } as CSSProperties;

    const wrapClassName = [
      "yk-modal",
      maximized
        ? "yk-modal--maximized"
        : heightValue
          ? "yk-modal--fixed-height"
          : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Modal
        open={open}
        title={titleNode}
        width={width}
        style={modalStyle}
        wrapClassName={wrapClassName}
        closable={pendingIndex < 0}
        maskClosable={closeOnClickModal}
        keyboard={closeOnPressEscape}
        destroyOnClose
        onCancel={cancelClose}
        afterClose={() => {
          onClosed?.();
          destroy();
        }}
        footer={footer}
      >
        {createElement(component as ComponentType<any>, {
          ...(componentProps ?? {}),
          onClose: close,
          ref: contentRef,
        })}
      </Modal>
    );
  },
);

function normalizeHeight(height: string | number | undefined): string | undefined {
  if (height == null) return undefined;
  return typeof height === "number" ? `${height}px` : height;
}

export function openModal(options: ModalOptions): ModalHandle {
  const {
    title = "",
    width = "500px",
    height,
    component,
    props,
    actions,
    onCancel,
    onClosed,
    closeOnClickModal = false,
    closeOnPressEscape = false,
    maximizable = false,
    defaultMaximized = false,
  } = options;

  // 占位容器：antd Modal 会渲染到 body，容器仅作为 React 根节点锚点，
  // 关闭动画结束后 root.unmount() 并移除容器
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  let destroyed = false;
  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    root.unmount();
    container.remove();
  };

  const hostRef: MutableRefObject<ModalHostHandle | null> = { current: null };
  const contentRef: MutableRefObject<unknown> = { current: null };

  /** 弹窗句柄：返回给调用方，同时作为 execute(handle) 传给底部动作 */
  const handle: ModalHandle = {
    close: () => hostRef.current?.close(),
    toggleMaximize: () => hostRef.current?.toggleMaximize(),
    isMaximized: () => hostRef.current?.isMaximized() ?? false,
    getContentInstance: () => contentRef.current ?? null,
  };

  root.render(
    <YsModalHost
      ref={hostRef}
      title={title}
      width={width}
      heightValue={normalizeHeight(height)}
      component={component}
      componentProps={props}
      actions={actions}
      onCancel={onCancel}
      onClosed={onClosed}
      closeOnClickModal={closeOnClickModal}
      closeOnPressEscape={closeOnPressEscape}
      maximizable={maximizable}
      defaultMaximized={defaultMaximized}
      contentRef={contentRef}
      modalHandle={handle}
      destroy={destroy}
    />,
  );

  return handle;
}
