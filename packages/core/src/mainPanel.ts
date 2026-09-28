/**
 * 主面板（YsMainPanel）功能树节点：
 * - children 非空：分组节点，渲染为可展开子菜单（component 被忽略）
 * - children 为空/缺省：叶子节点，点击后在右侧主面板以选项卡打开，
 *   选项卡内容经 component 指定的组件类型名称动态解析加载
 */
export interface FunctionNode {
    /** 节点唯一标识：同时作为功能树的菜单 index 与主面板选项卡的 key */
    readonly key: string;
    /** 菜单与选项卡的文案 */
    readonly label: string;
    /** 可选图标（emoji 等字符），渲染在叶子菜单与分组标题前缀处 */
    readonly icon?: string;
    /** 叶子节点对应的组件路径字符串（如 "./admin-panels/DashboardPanel.vue"），
     *  由 YsMainPanel 内部经动态 import 解析加载 */
    readonly component?: string;
    /** 叶子节点渲染面板组件时经 v-bind 透传的 props（静态声明，随节点定义；
     *  同一 component 类型可配合不同 props 与 key 开启多个实例） */
    readonly props?: Record<string, unknown>;
    /** 子节点；非空时该节点视为分组节点 */
    readonly children?: FunctionNode[];
}

/**
 * 主面板（YsMainPanel）功能树数据加载函数：
 * 异步返回功能树节点数组（数据可来自后端接口）。
 */
export type FunctionNodesFunc = () => Promise<FunctionNode[]>

/**
 * 主面板组件路径 → 异步加载器的映射：由消费方经 import.meta.glob 生成，
 * key 与 FunctionNode.component 取值一致（如 "./admin-panels/XxxPanel.vue"），
 * value 为对应组件模块的异步加载函数。
 */
export type MainPanelComponentMap = Record<string, () => Promise<unknown>>

/**
 * YsMainPanel 的「输入契约」：功能树数据加载函数、组件路径映射与初始激活节点。
 */
export interface MainPanelProps {
    readonly nodesFunc: FunctionNodesFunc;
    /** 组件路径 → 异步加载器映射（消费方 import.meta.glob 生成）；缺省时组件内部回退为运行时动态 import */
    readonly componentMap?: MainPanelComponentMap;
    /** 初始打开并激活的叶子节点 key（功能树加载完成后应用，仅首次生效），默认不打开任何选项卡 */
    readonly defaultActive?: string;
    /**
     * 是否在侧栏顶部渲染内置的功能搜索框（默认 true）。
     * 置 false 时不渲染内置搜索框，外部可经 v-model:menu-keyword 自行实现搜索入口；
     * 侧栏折叠为 64px 时内置搜索框也自动隐藏。
     */
    readonly showMenuSearch?: boolean;
    /**
     * 功能搜索关键词（受控）：对功能树叶子 label 做大小写不敏感的模糊匹配，
     * 命中叶子的祖先分组链保留并自动展开；为空字符串时显示完整功能树。
     * 与 `update:menuKeyword` 事件配合可使用 v-model:menu-keyword 双向绑定。
     */
    readonly menuKeyword?: string;
}
