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

/**
 * 最大化模式所需的少量全局样式：el-dialog teleport 到 body，
 * 组件内 scoped 样式无法命中，因此运行时向 head 注入一次（幂等）。
 * - 弹窗铺满视口（width 需 !important 覆盖 EP 的 inline width）
 * - 内容区 flex:1 + overflow:auto，长内容在弹窗内滚动
 * - 头部最大化按钮定位（absolute 锚定 .el-dialog__header 右上角 ✕ 左侧）
 */
const MAXIMIZE_STYLE_ID = "ys-modal-maximize-style";

function ensureMaximizeStyles(): void {
    if (document.getElementById(MAXIMIZE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = MAXIMIZE_STYLE_ID;
    style.textContent = [
        // 确保 header 是绝对定位锚点（EP 默认已是 relative，重复设置无副作用）
        ".el-dialog__header{position:relative}",
        ".ys-modal-dialog--maximized{--el-dialog-margin-top:0!important;width:100%!important;max-width:100%!important;margin-bottom:0!important;height:100vh;display:flex;flex-direction:column}",
        ".ys-modal-dialog--maximized .el-dialog__body{flex:1;min-height:0;overflow:auto}",
        ".ys-modal-header__maximize{position:absolute;right:44px;top:50%;transform:translateY(-50%);padding:6px;border:none;background:transparent;cursor:pointer;color:var(--el-color-info);display:inline-flex;align-items:center;justify-content:center;border-radius:4px}",
        ".ys-modal-header__maximize:hover{background:var(--el-fill-color-light);color:var(--el-color-primary)}",
    ].join("");
    document.head.appendChild(style);
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
    /**
     * 是否在标题栏显示「最大化 / 还原」按钮，默认 false。
     * 最大化时弹窗铺满视口（width 100% + height 100vh），内容区纵向滚动；
     * 再点还原回到 width 指定的尺寸。
     */
    maximizable?: boolean;
    /** 打开时即最大化，默认 false；仅 maximizable 为 true 时生效 */
    defaultMaximized?: boolean;
    /** 显式指定 AppContext，默认取插件注册时写入的全局 AppContext */
    appContext?: AppContext;
}

/** openModal 返回的弹窗句柄 */
export interface ModalHandle {
    /** 关闭弹窗（走关闭动画，动画结束后销毁 DOM），等同于内容组件 emit("close") */
    close: () => void;
    /** 切换最大化 / 还原（仅 maximizable 为 true 时有效果） */
    toggleMaximize: () => void;
    /** 当前是否处于最大化状态 */
    isMaximized: () => boolean;
    /** 获取内容组件实例（挂载完成后可用），便于调用其 defineExpose 的方法 */
    getContentInstance: () => ComponentPublicInstance | null;
}

/** 最大化图标（单框）：14px 线性 SVG，颜色跟随 currentColor */
function renderMaximizeIcon(): VNode {
    return h(
        "svg",
        {
            viewBox: "0 0 24 24",
            width: 14,
            height: 14,
            fill: "none",
            stroke: "currentColor",
            "stroke-width": 2,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
        },
        [h("rect", { x: 4, y: 4, width: 16, height: 16, rx: 2 })],
    );
}

/** 还原图标（双框交叠）：最大化态下标题栏按钮切换为还原 */
function renderRestoreIcon(): VNode {
    return h(
        "svg",
        {
            viewBox: "0 0 24 24",
            width: 14,
            height: 14,
            fill: "none",
            stroke: "currentColor",
            "stroke-width": 2,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
        },
        [
            h("rect", { x: 8, y: 8, width: 12, height: 12, rx: 2 }),
            h("path", { d: "M4 16V6a2 2 0 0 1 2-2h10" }),
        ],
    );
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
        maximizable = false,
        defaultMaximized = false,
        appContext,
    } = options;

    // maximizable 才需要注入最大化样式（幂等，可提前调用）
    if (maximizable) ensureMaximizeStyles();

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
            // 最大化状态：仅 maximizable 时可切换；defaultMaximized 决定初始值
            const maximized = ref(maximizable && defaultMaximized);

            const toggleMaximize = () => {
                if (maximizable) maximized.value = !maximized.value;
            };

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

            expose({ close, toggleMaximize, isMaximized: () => maximized.value });

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
                        title: maximizable ? undefined : title,
                        width,
                        // 最大化时贴顶（配合样式中 --el-dialog-margin-top:0）
                        top: maximized.value ? "0vh" : undefined,
                        class: maximized.value ? "ys-modal-dialog--maximized" : undefined,
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
                        // maximizable 时接管 header 插槽（标题 + 最大化按钮），
                        // EP 的 ✕ 关闭按钮渲染在插槽内容之外，自动保留
                        header: maximizable
                            ? () =>
                                  h("div", { class: "ys-modal-header" }, [
                                      h("span", { class: "el-dialog__title" }, title),
                                      h(
                                          "button",
                                          {
                                              type: "button",
                                              class: "ys-modal-header__maximize",
                                              title: maximized.value ? "还原" : "最大化",
                                              "aria-label": maximized.value ? "还原" : "最大化",
                                              onClick: toggleMaximize,
                                          },
                                          maximized.value ? renderRestoreIcon() : renderMaximizeIcon(),
                                      ),
                                  ])
                            : undefined,
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
    const resolvedAppContext = appContext ?? defaultAppContext;
    if (!resolvedAppContext) {
        // 未安装插件（app.use(YsCrudElementPlus)）也未显式传入 appContext 时，
        // 弹窗内模板无法解析任何全局组件（el-* / app.component 注册的组件），
        // 给出明确提示而非静默渲染成未解析的自定义元素
        console.warn(
            "[openModal] 未检测到 AppContext：弹窗内的全局组件（如 el-form）与 inject 将不可用。"
            + "请在应用入口 app.use(YsCrudElementPlus)，或调用 openModal 时传入 "
            + "appContext（getCurrentInstance()?.appContext）。",
        );
    }
    vnode.appContext = resolvedAppContext;
    render(vnode, container);

    const exposed = vnode.component?.exposed as
        | { close: () => void; toggleMaximize: () => void; isMaximized: () => boolean }
        | undefined;

    return {
        close: () => exposed?.close(),
        toggleMaximize: () => exposed?.toggleMaximize(),
        isMaximized: () => exposed?.isMaximized() ?? false,
        getContentInstance: () => contentInstance,
    };
}
