import {
    createVNode,
    defineComponent,
    h,
    ref,
    render,
    type AppContext,
    type Component,
    type ComponentPublicInstance,
    type VNode,
} from "vue";
import { ElButton, ElDialog } from "element-plus";

/**
 * 代码式弹窗服务：无需在 template 中预先声明 <el-dialog>，
 * 直接 openModal({ component, props }) 即可把任意 SFC 挂进弹窗。
 *
 * 典型用法：
 * ```ts
 * import { openModal } from "@ys-knife-crud/element-plus";
 * import UserEditForm from "./UserEditForm.vue";
 *
 * openModal({
 *   title: "编辑用户",
 *   component: UserEditForm,
 *   props: { userId: 123 },
 *   onConfirm: async () => {
 *     const ok = await saveUser();
 *     return ok;          // 返回 false 不关闭（校验失败）；其他值关闭
 *   },
 * });
 * ```
 *
 * 内容组件侧：
 * - 会被注入一个 onClose 监听器，内部 emit("close") 即可主动关闭弹窗
 * - 其余自定义事件（如 emit("saved", row)）经 listeners 选项透传
 * - showFooter: false 时底部按钮不渲染，由内容组件自行决定按钮与关闭时机
 */

/**
 * 模块级默认 AppContext：app.use(YsCrudElementPlus) 时由插件 install 写入，
 * 使动态挂载的弹窗能继承应用的 provide/inject（i18n / pinia / ElConfigProvider 等）。
 * 未使用插件时为 null，也可经 options.appContext 显式传入（getCurrentInstance()?.appContext）。
 */
let defaultAppContext: AppContext | null = null;

/** @internal 供插件 install 写入默认 AppContext，业务代码不要直接调用 */
export function setDefaultModalAppContext(ctx: AppContext | null): void {
    defaultAppContext = ctx;
}

/** openModal 选项 */
export interface ModalOptions<P extends Record<string, unknown> = Record<string, unknown>> {
    /** 弹窗标题，默认 "" */
    title?: string;
    /** 弹窗宽度（透传 el-dialog width），默认 "500px" */
    width?: string | number;
    /** 弹窗内容组件（SFC / 函数式组件均可） */
    component: Component;
    /** 传给内容组件的 props；同时自动注入 onClose 监听器（组件内 emit("close") 即关闭弹窗） */
    props?: P;
    /**
     * 透传给内容组件的事件监听器（Vue onXxx 命名），
     * 例如 { onSaved: (row) => ... } 对应内容组件 emit("saved", row)
     */
    listeners?: Record<string, (...args: unknown[]) => void>;
    /** 是否渲染底部「取消/确定」按钮，默认 true；false 时由内容组件自行渲染按钮 */
    showFooter?: boolean;
    /** 确定按钮文案，默认 "确定" */
    confirmText?: string;
    /** 取消按钮文案，默认 "取消" */
    cancelText?: string;
    /**
     * 点击「确定」的回调，支持异步：执行期间确定按钮显示 loading、
     * 取消按钮与右上角 ✕ 禁用。返回 false 表示校验未通过、弹窗不关闭；
     * 返回其他值（含 undefined）则关闭。未提供时点击确定直接关闭。
     */
    onConfirm?: () => unknown | Promise<unknown>;
    /** 取消类关闭回调：点击「取消」/ 右上角 ✕ / ESC（若开启）/ 遮罩（若开启）触发 */
    onCancel?: () => void;
    /** 弹窗完全关闭（关闭动画结束、DOM 销毁后）回调 */
    onClosed?: () => void;
    /** 点击遮罩是否关闭，默认 false（防止表单误关） */
    closeOnClickModal?: boolean;
    /** 按 ESC 是否关闭，默认 false（防止表单误关） */
    closeOnPressEscape?: boolean;
    /** 显式指定 AppContext，默认取插件注册时写入的全局 AppContext */
    appContext?: AppContext;
}

/** openModal 返回的弹窗句柄 */
export interface ModalHandle {
    /** 关闭弹窗（走关闭动画，动画结束后销毁 DOM），等同于内容组件 emit("close") */
    close: () => void;
    /** 获取内容组件实例（挂载完成后可用），便于调用其 defineExpose 的方法 */
    getContentInstance: () => ComponentPublicInstance | null;
}

export function openModal<P extends Record<string, unknown> = Record<string, unknown>>(
    options: ModalOptions<P>,
): ModalHandle {
    const {
        title = "",
        width = "500px",
        component,
        props,
        listeners,
        showFooter = true,
        confirmText = "确定",
        cancelText = "取消",
        onConfirm,
        onCancel,
        onClosed,
        closeOnClickModal = false,
        closeOnPressEscape = false,
        appContext,
    } = options;

    // 占位容器：ElDialog 会 teleport 到 body，容器仅作为 vnode 渲染锚点，
    // 销毁时 render(null, container) 才能正确解除 vnode 与 teleport 内容
    const container = document.createElement("div");
    document.body.appendChild(container);

    let contentInstance: ComponentPublicInstance | null = null;
    let destroyed = false;

    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        render(null, container);
        container.remove();
    };

    /**
     * 内部宿主组件：必须用 defineComponent 持有 visible/loading 这类响应式状态。
     * 若直接 h(ElDialog, { modelValue: visible.value })，ref 在创建 vnode 时
     * 被解包成静态布尔，之后修改 visible 不会触发 ElDialog 重渲染（弹窗关不掉）。
     */
    const Host = defineComponent({
        name: "YsModalHost",
        setup(_, { expose }) {
            const visible = ref(true);
            const confirmLoading = ref(false);

            /** 主动关闭（确定成功 / 内容组件 emit close / 外部 handle.close） */
            const close = () => {
                visible.value = false;
            };

            /** 取消类关闭：取消按钮 / ✕ / ESC / 遮罩 */
            const cancelClose = () => {
                if (confirmLoading.value) return; // 异步提交进行中，忽略取消
                onCancel?.();
                visible.value = false;
            };

            const handleConfirm = async () => {
                if (confirmLoading.value) return;
                if (!onConfirm) {
                    close();
                    return;
                }
                confirmLoading.value = true;
                try {
                    const result = await onConfirm();
                    // 返回 false 表示校验失败，保持弹窗打开；其他返回值关闭
                    if (result !== false) close();
                } finally {
                    confirmLoading.value = false;
                }
            };

            expose({ close });

            return () =>
                h(
                    ElDialog,
                    {
                        // Element Plus 2.x 显隐规范：modelValue + update:modelValue
                        modelValue: visible.value,
                        "onUpdate:modelValue": (v: boolean) => {
                            // 仅 el-dialog 内部发起关闭（✕ / ESC / 遮罩）时收到 false，
                            // 我们自己改 visible 不会回流到这里
                            if (!v) cancelClose();
                        },
                        title,
                        width,
                        closeOnClickModal,
                        closeOnPressEscape,
                        // 异步提交进行中隐藏右上角 ✕，与取消按钮禁用保持一致
                        showClose: !confirmLoading.value,
                        destroyOnClose: true,
                        onClosed: () => {
                            onClosed?.();
                            destroy();
                        },
                    },
                    {
                        default: () =>
                            h(component, {
                                ...(props ?? {}),
                                // 注入关闭监听器：内容组件 defineEmits(["close"]) 后
                                // emit("close") 即可关闭；无需在业务 props 里声明
                                onClose: close,
                                ...(listeners ?? {}),
                                ref: (instance: ComponentPublicInstance | null) => {
                                    contentInstance = instance;
                                },
                            }),
                        footer: () =>
                            showFooter
                                ? [
                                      h(
                                          ElButton,
                                          {
                                              disabled: confirmLoading.value,
                                              onClick: cancelClose,
                                          },
                                          () => cancelText,
                                      ),
                                      h(
                                          ElButton,
                                          {
                                              type: "primary",
                                              loading: confirmLoading.value,
                                              onClick: handleConfirm,
                                          },
                                          () => confirmText,
                                      ),
                                  ]
                                : null,
                    },
                );
        },
    });

    const vnode: VNode = createVNode(Host);
    // 继承 AppContext，使弹窗内 inject / 全局指令 / 全局组件可用
    vnode.appContext = appContext ?? defaultAppContext;
    render(vnode, container);

    const exposed = vnode.component?.exposed as { close: () => void } | undefined;

    return {
        close: () => exposed?.close(),
        getContentInstance: () => contentInstance,
    };
}
