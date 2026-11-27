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
   * formattedValue 为格式化值——有 formatter 时是 formatter(row, value) 的结果，否则等于原始值，
   * 便于 render 在格式化文本之上包一层样式（标签/颜色等）而不必重复转换逻辑。
   * 仅影响表格显示；导出与收集的格式化由 formatter 决定。
   */
  render?: (row: unknown, value: unknown, formattedValue: unknown) => unknown;
  /**
   * 可选。值格式化函数，默认 null。三处消费：
   * 1. 表格展示：render 优先，缺省时用 formatter 的返回值作为单元格文本；
   * 2. 导出 Excel：存在时优先于「按 propertyPath 取原始值」；
   * 3. 收集数据：openCollectDialog({ format }) 为 true（默认）时，声明了 formatter 的列
   *    以格式化值进入回调结果，其余字段保持原值。
   * 参数与 render 一致：row 为当前行数据、value 为按 propertyPath 取到的默认值。
   */
  formatter?: (row: unknown, value: unknown) => unknown;
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
 * 单元格取值：有 formatter 用 formatter(row, value)，否则按 propertyPath 取原始值（null 兜底）。
 * 导出 Excel 与「收集数据」格式化共用，避免两端逻辑漂移。
 */
export function formatCellValue(column: Column, row: unknown): unknown {
  const record = row as Record<string, unknown>;
  const value = record[column.propertyPath] ?? null;
  return column.formatter ? column.formatter(row, value) : value;
}

export function constMetaFunc(constValue: Meta): MetaFunc {
  return () => Promise.resolve(constValue);
}





