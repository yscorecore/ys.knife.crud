export interface Column {
  propertyPath: string;
  displayName: string;
  description: string | null;
  showForDisplay: boolean;
  displayFormat: string | null;
  isArray: boolean;
  dataTypeName: string;
  displayOrder: number;
  dataSource: unknown | null;
  queryFilter: unknown | null;
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





