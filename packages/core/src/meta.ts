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





