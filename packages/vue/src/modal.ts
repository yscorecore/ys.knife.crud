import type { AppContext, Component, ComponentPublicInstance } from "vue";
import type { ActionType } from "@ys-knife-crud/core";

/**
 * 代码式弹窗的框架无关契约层：
 * 本文件只定义类型与 AppContext 管理，不依赖任何 UI 组件库（element-plus / ant-design-vue 等）。
 * 具体弹窗外壳（el-dialog / a-modal 等）与底部按钮的渲染由各 UI 适配层实现。
 */

/**
 * 模块级默认 AppContext：app.use(插件) 时由适配层写入，
 * 使动态挂载的弹窗能继承应用的 provide/inject（i18n / pinia / ElConfigProvider 等）。
 * 未使用插件时为 null，也可经 options.appContext 显式传入（getCurrentInstance()?.appContext）。
 */
let defaultAppContext: AppContext | null = null;

/** @internal 供插件 install 写入默认 AppContext，业务代码不要直接调用 */
export function setDefaultModalAppContext(ctx: AppContext | null): void {
    defaultAppContext = ctx;
}

/** @internal 供 UI 适配层读取默认 AppContext */
export function getDefaultModalAppContext(): AppContext | null {
    return defaultAppContext;
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

/**
 * 从组件类型 C 提取其实例类型。
 * - 对 SFC（DefineComponent）等有构造签名的组件，提取出 InstanceType
 * - 对函数式组件等，fallback 到 ComponentPublicInstance
 * 用于泛型化 ModalAction.execute / DialogOptions.onConfirm 的 instance 参数，
 * 使调用方无需手动 `as InstanceType<typeof Xxx>` 断言。
 */
export type ExtractComponentInstance<C> = C extends abstract new (...args: any[]) => infer R
    ? R
    : ComponentPublicInstance;

/**
 * 弹窗底部动作按钮（如「取消 / 确定」），结构与 core 的 TableAction 同构：
 * 数据驱动渲染按钮（key=name、文案=desc、icon/type 同 TableAction）。
 * 泛型 C 为内容组件类型，execute 的 instance 参数自动推断为该组件的实例类型。
 */
export interface ModalAction<C extends Component = Component> {
    /** 动作标识（v-for key），不显示在界面上 */
    name: string,
    /** 按钮文案（与 TableAction 一致，渲染层显示 desc 而非 name），同时作为按钮 title 提示 */
    desc: string,
    /** 按钮图标（与 Action.icon 同构，渲染层用 <component :is> 兼容 Vue 组件 / 函数式组件 / VNode） */
    icon?: unknown,
    /** 按钮类型（对应按钮 type），缺省时按默认按钮处理 */
    type?: ActionType,
    /**
     * 执行动作。
     * - handle：弹窗句柄（close / getContentInstance 等），需要关闭弹窗时显式调用
     *   handle.close()（如校验失败则不调用、弹窗保持打开）
     * - instance：当前内容组件实例（底部按钮点击时内容组件一定已挂载，故非 null），
     *   可直接调用其 defineExpose 暴露的方法；类型由泛型 C 自动推断，无需手动断言
     * 返回 Promise 期间该按钮自动 loading，其余按钮禁用、右上角关闭按钮隐藏。
     */
    execute(handle: ModalHandle, instance: ExtractComponentInstance<C>): Promise<void> | void
}

/** openModal 选项（框架无关部分，UI 适配层可在此基础上扩展外壳相关选项） */
export interface ModalOptions<
    P extends Record<string, unknown> = Record<string, unknown>,
    C extends Component = Component,
> {
    /** 弹窗标题，默认 "" */
    title?: string;
    /** 弹窗宽度（透传 el-dialog width），默认 "500px" */
    width?: string | number;
    /**
     * 弹窗固定高度。不设置时高度由内容组件撑开（默认行为）；
     * 设置后弹窗为固定高度，内容区超出时在弹窗内纵向滚动，
     * 不会撑大弹窗。支持数字（px）或带单位的字符串（如 "600px" / "70vh"）。
     */
    height?: string | number;
    /** 弹窗内容组件（SFC / 函数式组件均可）；驱动泛型 C 推断 actions.execute 的 instance 类型 */
    component: C;
    /**
     * 传给内容组件的 props；同时自动注入 onClose 监听器（组件内 emit("close") 即关闭弹窗）。
     * Vue 3 中事件监听也是 props（onXxx 命名）：内容组件 emit("saved", row) 时
     * 传 props: { onSaved: (row) => ... } 即可接收
     */
    props?: P;
    /**
     * 底部动作按钮（如「取消 / 确定」），数据驱动渲染为按钮；
     * 传入非空数组即渲染底部按钮区，不传或传空数组则不渲染底部，
     * 由内容组件自行决定按钮与关闭时机。每项动作执行期间该按钮自动 loading，
     * 其余按钮禁用、右上角关闭按钮隐藏；需要关闭弹窗时在 execute 内调用 handle.close()。
     */
    actions?: ModalAction<C>[];
    /** 取消类关闭回调：点击右上角关闭按钮 / ESC（若开启）/ 遮罩（若开启）等非底部按钮方式关闭时触发 */
    onCancel?: () => void;
    /** 弹窗完全关闭（关闭动画结束、DOM 销毁后）回调 */
    onClosed?: () => void;
    /** 点击遮罩是否关闭，默认 false（防止表单误关） */
    closeOnClickModal?: boolean;
    /** 按 ESC 是否关闭，默认 false（防止表单误关） */
    closeOnPressEscape?: boolean;
    /**
     * 是否在标题栏显示「最大化 / 还原」按钮，默认 false。
     * 最大化时弹窗铺满视口，内容区纵向滚动；再点还原回到 width 指定的尺寸。
     */
    maximizable?: boolean;
    /** 打开时即最大化，默认 false；仅 maximizable 为 true 时生效 */
    defaultMaximized?: boolean;
    /** 显式指定 AppContext，默认取插件注册时写入的全局 AppContext */
    appContext?: AppContext;
}

/**
 * openDialog 选项：openModal 的简化封装，固定提供「取消 / 确定」两个底部按钮。
 * 不继承 actions 属性（底部按钮固定，如需自定义按钮请使用 openModal）。
 * 泛型 C 为内容组件类型，onConfirm 的 instance 参数自动推断为该组件的实例类型。
 */
export interface DialogOptions<
    P extends Record<string, unknown> = Record<string, unknown>,
    C extends Component = Component,
> extends Omit<ModalOptions<P, C>, "actions"> {
    /** 确定按钮文案，默认 "确定" */
    confirmText?: string;
    /** 取消按钮文案，默认 "取消" */
    cancelText?: string;
    /** 确定按钮类型（对应按钮 type），默认 "primary" */
    confirmType?: ActionType;
    /**
     * 点击「确定」的回调，支持异步：执行期间确定按钮显示 loading、
     * 取消按钮与右上角关闭按钮禁用/隐藏。返回 false 表示校验未通过、弹窗不关闭；
     * 其他返回值（含 undefined）则关闭。未提供时点击确定直接关闭。
     * 第二个参数 instance 为内容组件实例（点击确定时一定已挂载，故非 null），
     * 类型由泛型 C 自动推断，可直接调用其 defineExpose 暴露的方法。
     */
    onConfirm?: (
        handle: ModalHandle,
        instance: ExtractComponentInstance<C>,
    ) => unknown | Promise<unknown>;
}
