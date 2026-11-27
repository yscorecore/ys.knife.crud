export interface Column {
  /** 唯一必填：行数据的取值路径，也是自定义配置/导出寻址的 key */
  propertyPath: string;
  /** 显示名；缺省时 UI 层回落到 propertyPath */
  displayName?: string;
  description?: string | null;
  /** 是否在表格中显示；缺省视为 true */
  showForDisplay?: boolean;
  displayFormat?: string | null;
  isArray?: boolean;
  dataTypeName?: string;
  /** 显示顺序权重；缺省按 columns 数组中的顺序 */
  displayOrder?: number;
  dataSource?: unknown | null;
  queryFilter?: unknown | null;
  /**
   * 可选。自定义单元格渲染：存在时优先于 formatter 与默认的「按 propertyPath 取值显示」。
   * 返回字符串按文本渲染，返回 VNode 按节点渲染（由 UI 层呈现）。
   * 参数 row 为当前行数据、value 为按 propertyPath 取到的默认值；
   * formattedValue 为格式化值——列 formatter 优先，缺省用全局默认 formatter
   * （见 setDefaultFormatter），都没有时等于原始值，
   * 便于 render 在格式化文本之上包一层样式（标签/颜色等）而不必重复转换逻辑。
   * 缺省时回落到 setDefaultRender 注册的默认 render 工厂。
   * 仅影响表格显示；导出与收集的格式化由 formatter 决定。
   */
  render?: CellRenderer;
  /**
   * 可选。值格式化函数，默认 null。三处消费：
   * 1. 表格展示：render 优先，缺省时用 formatter 的返回值作为单元格文本；
   * 2. 导出 Excel：存在时优先于「按 propertyPath 取原始值」；
   * 3. 收集数据：openCollectDialog({ format }) 为 true（默认）时，声明了 formatter 的列
   *    以格式化值进入回调结果，其余字段保持原值。
   * 参数 row 为当前行数据、value 为按 propertyPath 取到的默认值、column 为当前列定义。
   * 缺省时回落到 setDefaultFormatter 注册的全局默认实现；全局默认也未注册时保持原值。
   */
  formatter?: CellFormatter;
  /**
   * 列宽（px 字符串，如 "120"）：由 UI 层基于自定义配置写入，
   * 表格组件据此设置 el-table-column 的 width。
   * meta 原始列不带 width（undefined），由 useCustomConfig 在合并
   * CustomConfig.columns[propertyPath].width 时附到返回的列对象上。
   */
  width?: string;
}

export interface Meta {
  displayName: string;
  description: string | null;
  columns: Column[];
}



export type MetaFunc = (signal?: AbortSignal) => Promise<Meta>;

/**
 * 单元格格式化函数：row 为行数据、value 为按 propertyPath 取到的原值、
 * column 为列定义（实现里可据 dataTypeName / dataSource 等分派，如日期、枚举字典）。
 */
export type CellFormatter = (row: unknown, value: unknown, column: Column) => unknown;

/** 默认 formatter 工厂：根据当前列创建 CellFormatter；返回 null 时该列保持原值 */
export type DefaultFormatterFactory = (column: Column) => CellFormatter | null;

/**
 * 单元格渲染函数：row 为行数据、value 为按 propertyPath 取到的原值、
 * formattedValue 为格式化值、column 为当前列定义。
 * 返回字符串按文本渲染，返回 VNode / React 元素按节点渲染（由 UI 层呈现）。
 */
export type CellRenderer = (
  row: unknown,
  value: unknown,
  formattedValue: unknown,
  column: Column,
) => unknown;

/** 默认 render 工厂：根据当前列创建 CellRenderer；返回 null 时该列按格式化值直接显示 */
export type DefaultRendererFactory = (column: Column) => CellRenderer | null;

let defaultFormatter: DefaultFormatterFactory | null = null;
let defaultRenderer: DefaultRendererFactory | null = null;

/**
 * 注册全局默认 formatter 工厂：工厂接收当前 Column，返回该列使用的 CellFormatter 或 null。
 * 列 formatter 优先，缺省使用工厂创建的 formatter；工厂返回 null 时保持原值。
 * 传 null 或不传清除工厂。
 * 显示 / 导出 Excel / 收集数据（format=true）三处共用。
 *
 * 契约：只在应用初始化时调用一次，运行期间不再变更。
 * 这是模块级全局状态且非响应式——运行期改注册不会触发界面重渲染，
 * 表格要到下一次自然重渲染才会用上新值；微前端多应用同页、SSR 多请求场景慎用。
 */
export function setDefaultFormatter(factory?: DefaultFormatterFactory | null): void {
  defaultFormatter = factory ?? null;
}

/** 当前列的全局默认 formatter（未注册工厂或工厂返回 null 时为 null） */
export function getDefaultFormatter(column: Column): CellFormatter | null {
  return defaultFormatter ? defaultFormatter(column) : null;
}

/**
 * 单元格取值：列 formatter 优先，缺省用默认工厂为当前列创建的 formatter（未注册时即原值）。
 * 表格展示、导出 Excel 与「收集数据」格式化共用，避免各处逻辑漂移。
 */
export function formatCellValue(column: Column, row: unknown): unknown {
  const record = row as Record<string, unknown>;
  const value = record[column.propertyPath] ?? null;
  const formatter = column.formatter ?? getDefaultFormatter(column);
  return formatter ? formatter(row, value, column) : value;
}

/**
 * 注册全局默认 render 工厂：工厂接收当前 Column，返回该列使用的 CellRenderer 或 null。
 * 列 render 优先，缺省使用工厂创建的 render；工厂返回 null 时该列按格式化值直接显示。
 * 传 null 或不传清除工厂。仅影响表格显示，导出与收集仍由 formatter 决定。
 *
 * 契约：只在应用初始化时调用一次，运行期间不再变更。
 * 与 setDefaultFormatter 一样是模块级全局状态且非响应式——运行期改注册不会触发界面重渲染。
 */
export function setDefaultRender(factory?: DefaultRendererFactory | null): void {
  defaultRenderer = factory ?? null;
}

/** 当前列的全局默认 render（未注册工厂或工厂返回 null 时为 null） */
export function getDefaultRender(column: Column): CellRenderer | null {
  return defaultRenderer ? defaultRenderer(column) : null;
}

/**
 * 当前列生效的 render：列 render 优先，缺省用默认工厂为当前列创建的 render；都没有时为 null。
 * 表格展示据此决定是否走自定义渲染分支。
 */
export function getCellRender(column: Column): CellRenderer | null {
  return column.render ?? getDefaultRender(column);
}

export function constMetaFunc(constValue: Meta): MetaFunc {
  return () => Promise.resolve(constValue);
}





