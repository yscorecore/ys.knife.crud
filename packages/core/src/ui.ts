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
 * 自定义列的配置 props
 */
export interface CustomConfigProps {
    readonly showCustomConfig: boolean;
    readonly loadCustomConfigFun?: loadCustomConfigFunc;
    readonly saveCustomConfigFun?: saveCustomConfigFunc;
}
export interface ExportExcelProps {
    readonly showExportExcel: boolean;
    /** 可选。导出实现工厂；缺省使用 core 的控制台假实现（createConsoleExportApiFunc，只打日志不产出文件） */
    readonly exportApiFunc?: ExportApiFunc;
    readonly exportPageSize?: number;

}
export interface DefaultProps {
    readonly metaFun: MetaFunc
    readonly dataFun: PageFunc<unknown>,
    readonly pageSize: number,
    readonly pageSizes: number[],
}


/** TableProps 是组件的「输入契约」：父组件通过 props 传入 */
export interface TableProps extends RowActionsProps, SelectionProps, CustomConfigProps, ExportExcelProps, DefaultProps {

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
    /** 重新加载元数据、数据与行操作 */
    reload(): void
    /** 清空全部选中（含其他页的选中） */
    clearSelection(): void
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