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
   * 可选。自定义单元格渲染：存在时优先于默认的「按 propertyPath 取值显示」。
   * 返回字符串按文本渲染，返回 VNode 按节点渲染（由 UI 层呈现）。
   * 参数 row 为当前行数据、value 为按 propertyPath 取到的默认值。
   * 仅影响表格显示；导出仍按 propertyPath 取原始值。
   */
  render?: (row: unknown, value: unknown) => unknown;
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

export function constMetaFunc(constValue: Meta): MetaFunc {
  return () => Promise.resolve(constValue);
}





