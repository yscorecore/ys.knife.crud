import type { Meta, MetaFunc } from "./meta"
import type { PageFunc } from "./page"
import type { PagedList } from "ys.knife.query.js"
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