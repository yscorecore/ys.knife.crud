
export interface CustomColumnConfig {
    propertyPath: string,
    /** 可选。缺省视为 true（显示该列） */
    visible?: boolean,
    /** 可选。缺省按 displayOrder 顺序回落 */
    order?: number,
    /** 可选。缺省/空字符串视为未设置（不指定列宽） */
    width?: string,
}

export interface CustomConfig {
    pageSize?: number,
    columns: Record<string, CustomColumnConfig>,
}

/** 加载自定义配置；返回 null 表示「尚未保存过配置」，调用方按空配置处理 */
export type loadCustomConfigFunc = (signal?: AbortSignal) => Promise<CustomConfig | null>

export type saveCustomConfigFunc = (config: CustomConfig, signal?: AbortSignal) => Promise<void>

export function constConfig(config: CustomConfig): loadCustomConfigFunc {
    return () => Promise.resolve(config);
}
export function emptyConfig(): loadCustomConfigFunc {
    return constConfig({ columns: {} });
}
export function mergeConfigs(...configs: loadCustomConfigFunc[]): loadCustomConfigFunc {
    return async (signal?: AbortSignal): Promise<CustomConfig> => {
        // 提前检查，避免无谓的调用
        if (signal?.aborted) {
            throw signal.reason ?? new DOMException("Aborted", "AbortError");
        }

        // 并行执行所有配置函数
        const results = await Promise.all(configs.map((c) => c(signal)));

        // 合并结果（浅拷贝，不修改原始对象）；null 表示该来源无配置，跳过
        const merged: CustomConfig = { columns: {} };
        for (const result of results) {
            if (!result) continue;
            for (const key of Object.keys(result.columns)) {
                const config = result.columns[key];
                if (config !== undefined) {
                    merged.columns[key] = { ...config };
                }
            }
            if (result.pageSize !== undefined) {
                merged.pageSize = result.pageSize;
            }
        }
        return merged;
    };
}

export function saveLocalStorageConfig(key: string): saveCustomConfigFunc {
    return (config: CustomConfig) => {
        localStorage.setItem(key, JSON.stringify(config));
        return Promise.resolve()
    }
}
export function loadLocalStorageConfig(key: string): loadCustomConfigFunc {
    return () => {
        const text = localStorage.getItem(key);
        if (text) {
            return Promise.resolve(JSON.parse(text) as CustomConfig);
        }
        // 尚未保存过 → null（调用方按空配置处理）
        return Promise.resolve(null);
    }
}