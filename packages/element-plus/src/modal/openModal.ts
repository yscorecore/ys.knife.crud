import {
    createVNode,
    defineComponent,
    h,
    isVNode,
    ref,
    render,
    type Component,
    type ComponentPublicInstance,
    type VNode,
} from "vue";
import { ElButton, ElDialog } from "element-plus";
import {
    getDefaultModalAppContext,
    setDefaultModalAppContext,
    type ExtractComponentInstance,
    type ModalAction,
    type ModalHandle,
    type ModalOptions,
} from "@ys-knife-crud/vue";

// 重新导出 setDefaultModalAppContext，保持 element-plus 的对外 API 不变
// （插件 install 时调用此函数写入 AppContext）
export { setDefaultModalAppContext };

/**
 * 代码式弹窗服务（Element Plus 适配层）：
 * 类型契约与 AppContext 管理定义在 @ys-knife-crud/vue，本文件只负责
 * 用 ElDialog / ElButton 实现具体的外壳渲染、底部按钮渲染、最大化样式。
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
 *   actions: [
 *     { name: "cancel", desc: "取消", execute: (handle) => handle.close() },
 *     {
 *       name: "save",
 *       desc: "保存",
 *       type: "primary",
 *       execute: async (handle) => {
 *         // 校验/保存……校验失败时不调用 close，弹窗保持打开
 *         await saveUser();
 *         handle.close();
 *       },
 *     },
 *   ],
 * });
 * ```
 *
 * 内容组件侧：
 * - 会被注入一个 onClose 监听器，内部 emit("close") 即可主动关闭弹窗
 * - 其余自定义事件（如 emit("saved", row)）由调用方在 props 里传 onSaved 接收
 * - 不传 actions 时底部按钮区不渲染，由内容组件自行决定按钮与关闭时机
 */

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
        // 注意：不要给 .el-dialog__header 加 position:relative——
        // EP 默认 header 是 static，关闭按钮 .el-dialog__headerbtn 相对 .el-dialog(relative)
        // 定位；一旦 header 变 relative，关闭按钮包含块改变（多出 header padding 偏移），
        // 导致「有最大化按钮时关闭按钮位置与无最大化时不一致」。
        // 最大化按钮同样 absolute，会自动跳过 static 的 header、以 .el-dialog 为包含块，
        // 与关闭按钮处于完全相同的坐标系。
        ".ys-modal-dialog--maximized{--el-dialog-margin-top:0!important;width:100%!important;max-width:100%!important;margin-bottom:0!important;height:100vh;display:flex;flex-direction:column}",
        ".ys-modal-dialog--maximized .el-dialog__body{flex:1;min-height:0;overflow:auto}",
        // 与 EP 关闭按钮同一包含块(.el-dialog)、同一基线(top:0/right:0)：
        // 关闭热区 48x48，最大化按钮右移 48+4=52px 紧贴其左侧
        ".ys-modal-header__maximize{position:absolute;right:52px;top:0;width:48px;height:48px;padding:0;border:none;background:transparent;cursor:pointer;color:var(--el-color-info);display:inline-flex;align-items:center;justify-content:center;border-radius:4px}",
        ".ys-modal-header__maximize:hover{background:var(--el-fill-color-light);color:var(--el-color-primary)}",
        // EP 关闭图标在其 48px 热区中视觉中心偏上 2px（受其 line-height 影响），
        // 补偿使两个图标的视觉中心完全水平对齐
        ".ys-modal-header__maximize svg{display:block;margin-top:-2px}",
    ].join("");
    document.head.appendChild(style);
}

/** 最大化图标（单框）：16px 线性 SVG，与 EP 关闭图标同尺寸、颜色跟随 currentColor */
function renderMaximizeIcon(): VNode {
    return h(
        "svg",
        {
            viewBox: "0 0 24 24",
            width: 16,
            height: 16,
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
            width: 16,
            height: 16,
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

export function openModal<
    P extends Record<string, unknown> = Record<string, unknown>,
    C extends Component = Component,
>(options: ModalOptions<P, C>): ModalHandle {
    const {
        title = "",
        width = "500px",
        component,
        props,
        actions,
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
    // Host setup 的 expose() 结果，render 后回填；handle 方法均惰性解引用，
    // 因此可先构造 handle 并传给 actions.execute，点击时 exposed 已就绪
    let exposed: Pick<ModalHandle, "close" | "toggleMaximize" | "isMaximized"> | undefined;

    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        render(null, container);
        container.remove();
    };

    /** 弹窗句柄：返回给调用方，同时作为 execute(handle) 传给底部动作 */
    const handle: ModalHandle = {
        close: () => exposed?.close(),
        toggleMaximize: () => exposed?.toggleMaximize(),
        isMaximized: () => exposed?.isMaximized() ?? false,
        getContentInstance: () => contentInstance,
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
            // 正在执行的 actions 下标（-1 = 空闲）：执行中该按钮 loading、
            // 其余按钮禁用、右上角 ✕ 隐藏，与旧的异步提交体验保持一致
            const pendingIndex = ref(-1);
            // 最大化状态：仅 maximizable 时可切换；defaultMaximized 决定初始值
            const maximized = ref(maximizable && defaultMaximized);

            const toggleMaximize = () => {
                if (maximizable) maximized.value = !maximized.value;
            };

            /** 主动关闭（动作内 handle.close() / 内容组件 emit close / 外部 handle.close） */
            const close = () => {
                visible.value = false;
            };

            /** 取消类关闭：✕ / ESC / 遮罩 */
            const cancelClose = () => {
                if (pendingIndex.value >= 0) return; // 动作执行中，忽略取消
                onCancel?.();
                visible.value = false;
            };

            /** 执行底部动作：执行中忽略重复点击，Promise 结束后解除 loading。
             *  第二个参数传当前内容组件实例。底部按钮可点击意味着内容组件已挂载，
             *  故 contentInstance 此时非 null，直接透传给 execute 的 instance 参数。
             */
            const runAction = async (action: ModalAction<C>, index: number) => {
                if (pendingIndex.value >= 0) return;
                pendingIndex.value = index;
                try {
                    await action.execute(handle, contentInstance as ExtractComponentInstance<C>);
                } finally {
                    pendingIndex.value = -1;
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
                        // 动作执行中隐藏右上角 ✕，与底部其余按钮禁用保持一致
                        showClose: pendingIndex.value < 0,
                        destroyOnClose: true,
                        onClosed: () => {
                            onClosed?.();
                            destroy();
                        },
                    },
                    {
                        // maximizable 时接管 header 插槽：标题 span + 最大化按钮。
                        // 不额外包裹 div——span 直接作为 header 子元素，与 EP 默认
                        // 标题结构一致，避免 block 包裹改变标题的行盒/换行行为；
                        // 按钮 absolute 脱离文档流，以 .el-dialog 为包含块定位。
                        // EP 的 ✕ 关闭按钮渲染在插槽内容之外，自动保留且定位不受影响。
                        header: maximizable
                            ? () => [
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
                              ]
                            : undefined,
                        default: () =>
                            h(component, {
                                ...(props ?? {}),
                                // 注入关闭监听器：内容组件 defineEmits(["close"]) 后
                                // emit("close") 即可关闭；无需在业务 props 里声明。
                                // 注意 onClose 在 props 展开之后，业务 props 里的 onClose
                                // 会被注入值覆盖（关闭行为不交给业务侧）
                                onClose: close,
                                ref: (instance: ComponentPublicInstance | null) => {
                                    contentInstance = instance;
                                },
                            }),
                        footer: () =>
                            actions?.length
                                ? actions.map((action, index) =>
                                      h(
                                          ElButton,
                                          {
                                              key: action.name,
                                              // 与 commandBar 同构：'default' 归一化为 undefined
                                              type: action.type === "default" ? undefined : action.type,
                                              title: action.desc,
                                              // 执行中：当前动作 loading，其余动作禁用
                                              disabled: pendingIndex.value >= 0 && pendingIndex.value !== index,
                                              loading: pendingIndex.value === index,
                                              onClick: () => runAction(action, index),
                                          },
                                          {
                                              default: () => [
                                                  // 与模板 <component :is> 行为对齐：VNode 原样嵌入、组件 h() 渲染；
                                                  // 外包 span 提供与 commandBar 图标一致的间距（teleport 内容无法用 scoped 样式命中）
                                                  action.icon
                                                      ? h(
                                                            "span",
                                                            {
                                                                style: "margin-right:4px;display:inline-flex;align-items:center;vertical-align:-2px",
                                                            },
                                                            [isVNode(action.icon) ? action.icon : h(action.icon as Component)],
                                                        )
                                                      : null,
                                                  action.desc,
                                              ],
                                          },
                                      ),
                                  )
                                : null,
                    },
                );
        },
    });

    const vnode: VNode = createVNode(Host);
    // 继承 AppContext，使弹窗内 inject / 全局指令 / 全局组件可用
    const resolvedAppContext = appContext ?? getDefaultModalAppContext();
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

    // render 后回填 Host expose 的方法，handle 的惰性解引用自此生效
    exposed = vnode.component?.exposed as
        | Pick<ModalHandle, "close" | "toggleMaximize" | "isMaximized">
        | undefined;

    return handle;
}
