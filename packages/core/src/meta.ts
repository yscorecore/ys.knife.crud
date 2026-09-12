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







export interface ColumnConfig {
  propertyPath: string,
  visible: boolean,
  order: number,
  width: string,
}

export type ColumnConfigs = Record<string, ColumnConfig>;

export type ConfigFunc = (signal?: AbortSignal) => Promise<ColumnConfigs>


export function constConfig(config: ColumnConfigs): ConfigFunc {
  return () => Promise.resolve(config);
}
export function emptyConfig(): ConfigFunc {
  return constConfig({});
}
export function mergeConfigs(...configs: ConfigFunc[]): ConfigFunc {
  return async (signal?: AbortSignal): Promise<ColumnConfigs> => {
    // 提前检查，避免无谓的调用
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }

    // 并行执行所有配置函数
    const results = await Promise.all(configs.map((c) => c(signal)));

    // 合并结果（浅拷贝，不修改原始对象）
    const merged: ColumnConfigs = {};
    for (const result of results) {
      for (const key of Object.keys(result)) {
        const config = result[key];
        if (config !== undefined) {
          merged[key] = { ...config };
        }
      }
    }
    return merged;
  };
}