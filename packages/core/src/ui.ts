import type { Meta, MetaFunc } from "./meta"
import type { PageFunc } from "./page"
import { type PagedList,type FilterInfo, Operator } from "ys.knife.query.js"
import type { Action, RowActionsFunc } from "./action"
import type { loadCustomConfigFunc as loadCustomConfigFunc, saveCustomConfigFunc } from "./customConfig"
import type { ExportApiFunc } from "./export"

/**
 * 行操作 props
 */
export interface RowActionsProps {
    readonly rowActionsFunc?: RowActionsFunc<unknown>;
}
export interface SelectionProps {
    showCheckbox?: boolean,
}

/**
 * 表格的展示形态：
 * - table：传统表格视图（默认）
 * - card：卡片网格视图（卡片内容可经 #card 插槽自定义，默认 JSON 序列化展示整行）
 * - list：列表视图，一行一条数据、占满整行宽度（行内容可经 #list 插槽自定义，
 *   默认 JSON 序列化展示整行；checkbox 在行首，行操作右键菜单与卡片视图共用）
 */
export type ViewMode = "table" | "card" | "list"

/**
 * 展示形态相关 props
 */
export interface ViewProps {
    /** 展示形态，默认 "table"。配合 update:viewMode 事件可使用 v-model:view-mode 受控切换 */
    readonly viewMode?: ViewMode;
    /** 内置视图切换控件要显示的模式集合，默认 []（不渲染内置切换控件）。
     *  非空时在工具栏渲染切换控件，且只包含数组中列出的模式（按数组顺序），
     *  如 ["table", "card", "list"]；保持默认空数组即完全由外部自控（仍可用 v-model:view-mode 驱动） */
    readonly viewSwitchModes?: ViewMode[];
}
/**
 * 自定义列的配置 props
 */
export interface CustomConfigProps {
    /** 为 true 时渲染内置「⚙ 列设置」按钮；false 时不渲染内置按钮——外部可自实现按钮，
     *  经 TableApi.openConfigDialog() 打开内置面板（面板始终挂载） */
    readonly showCustomConfig: boolean;
    readonly loadCustomConfigFun?: loadCustomConfigFunc;
    readonly saveCustomConfigFun?: saveCustomConfigFunc;
}
export interface ExportExcelProps {
    /** 为 true 时渲染内置「⬇ 导出 Excel」按钮；false 时不渲染内置按钮——外部可自实现按钮，
     *  经 TableApi.openExportDialog() 打开内置对话框（对话框始终挂载） */
    readonly showExportExcel: boolean;
    /** 可选。导出实现工厂；缺省使用 core 的控制台假实现（createConsoleExportApiFunc，只打日志不产出文件） */
    readonly exportorFunc?: ExportApiFunc;
    readonly exportPageSize?: number;

}
export interface DefaultProps {
    readonly metaFun: MetaFunc
    readonly dataFun: PageFunc<unknown>,
    readonly pageSize: number,
    readonly pageSizes: number[],
}


/** TableProps 是组件的「输入契约」：父组件通过 props 传入 */
export interface TableProps extends RowActionsProps, SelectionProps, ViewProps, CustomConfigProps, ExportExcelProps, DefaultProps {

}

/**
 * TableApi 是组件的「输出契约」：组件通过 defineExpose 暴露、
 * 父组件通过模板 ref 调用的 API。
 *
 * 组件实现侧用 `satisfies` 校验 exposed 对象覆盖本接口的全部成员，
 * 缺少任何方法/状态都会编译报错，从而强制组件实现该契约。
 *
 * 注意：这里的状态成员是「解包后」的视图（如 selectedRows: unknown[]），
 * 因为父组件经模板 ref 访问 expose 代理时 ref 会被自动解包；
 * 组件内部实现时每个状态对应一个 Ref<成员类型>（见 Table.vue 的 ExposedShape）。
 */
export interface TableApi {
    /** 列元数据（metaFun 加载结果，未加载完成时为 null） */
    readonly meta: Meta | null
    /** 当前页数据（dataFun 加载结果，未加载完成时为 null） */
    readonly paged: PagedList<unknown> | null
    /** 当前页码（1 基） */
    readonly currentPage: number
    /** checkbox 列当前选中的行（跨页累计，reserve-selection） */
    readonly selectedRows: unknown[]
    /** 当前页的行数据（dataFun 返回的 PagedList.items；挂载前为空数组） */
    readonly rows: unknown[]
    /** 重新加载元数据、数据与行操作 */
    reload(): void
    /** 清空全部选中（含其他页的选中） */
    clearSelection(): void
    /**
     * 打开内置列设置对话框。showCustomConfig=false（不渲染内置「⚙ 列设置」按钮）、
     * 外部自实现按钮时经此入口打开面板。
     */
    openConfigDialog(): void
    /**
     * 打开内置导出 Excel 对话框。showExportExcel=false（不渲染内置「⬇ 导出 Excel」按钮）、
     * 外部自实现按钮时经此入口打开对话框。
     */
    openExportDialog(): void
}



/**
 * 列设置面板里单个可编辑列的草稿（运行时结构）：
 * 由 UI 层生成（基于 meta + CustomConfig），用户编辑后再回写 CustomConfig。
 * 与 CustomColumnConfig 的区别：width 缺省时为空字符串（而非可选），
 * visible 缺省视为 true，order 由数组下标决定。
 */
export interface DraftColumn {
    propertyPath: string,
    displayName: string,
    visible: boolean,
    width: string,
}

/**
 * 导出范围：选中 / 当前页 / 所有。
 * UI 层用此类型标识导出对话框里的三个范围按钮，
 * 导出逻辑（useExportExcel）据此分派：selected/page 直接写，all 走逐页流式。
 */
export type ExportScope = "selected" | "page" | "all"

/**
 * 导出选项（UI 层 useExportExcel 计算得出，驱动导出对话框按钮组）。
 * disabled 为 true 时按钮置灰（如未选中任何行时的「导出选中」）。
 */
export interface ExportOption {
    value: ExportScope,
    label: string,
    disabled: boolean,
}

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
}
/**
 * 单字段查询条件的通用 props 契约。各具体类型（Text/Number/Date/Bool...）的 FilterItem
 * 组件在此基础上各自扩展（如 number 的 min/max、date 的 valueFormat 等），不再共用 type 字段：
 * 由各具体 FilterItem 组件声明（如 <ys-text-filter-item>），使用方在 filterPanel 插槽里
 * 直接选用要渲染哪些 item 组件，不在一个组件内做 type 工厂分支。
 *
 * op 由声明方指定（文本常 Contains、数字常 Equals/Between、日期常 Between）。
 */
export interface FilterItemProps {
    /** 显示标签（渲染在控件左侧） */
    readonly label: string;
    /** 运算符；由声明方指定，不同类型有不同默认（文本常 Contains、数字常 Equals/Between） */
    readonly op: Operator;
    /** 实体属性路径（FilterInfo.left），如 "name" / "user.age" */
    readonly propertyPath: string;
    /** 初始值；类型由具体 FilterItem 组件决定（文本为 string、日期区间为 [start,end] 等） */
    readonly defaultValue?: unknown;
    /** 可选占位文本 */
    readonly placeholder?: string;
}
export interface FilterItemApi {
    /**
     * 当前值构造出的 FilterInfo；值为空时返回 null（表示「无查询条件」），
     * panel 端聚合时直接跳过 null，不参与 createAnd。
     */
    readonly filter: FilterInfo | null;
    /** 当前控件值（date 为 [start,end]，其余为单值）；供外部（含 demo）读取做客户端过滤 */
    readonly value: unknown;
    reset(): void;
}
export interface FilterPanelProps {
    /** 是否渲染内置「搜索」按钮，默认 true。false 时外部自实现按钮经 ref 取 filter 触发 */
    readonly showSearch?: boolean;
    /** 是否渲染内置「重置」按钮，默认 true */
    readonly showReset?: boolean;
    /** 搜索按钮文案，默认 "搜索" */
    readonly searchButtonText?: string;
    /** 重置按钮文案，默认 "重置" */
    readonly resetButtonText?: string;
}
export interface FilterPanelApi {
    /** 聚合所有已注册 FilterItem 的 FilterInfo；全部为空时返回 emptyFilter() */
    readonly filter: FilterInfo;
    reset(): void;
}