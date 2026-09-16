
export interface CustomColumnConfig {
    propertyPath: string,
    visible: boolean,
    order: number,
    width: string,
}

export interface CustomConfigs {
    pageSize?: number,
    columns: Record<string, CustomColumnConfig>,
}

/** 加载自定义配置；返回 null 表示「尚未保存过配置」，调用方按空配置处理 */
export type loadConfigFunc = (signal?: AbortSignal) => Promise<CustomConfigs | null>

export type saveCustomConfigFunc = (config: CustomConfigs, signal?: AbortSignal) => Promise<void>

export function constConfig(config: CustomConfigs): loadConfigFunc {
    return () => Promise.resolve(config);
}
export function emptyConfig(): loadConfigFunc {
    return constConfig({ columns: {} });
}
export function mergeConfigs(...configs: loadConfigFunc[]): loadConfigFunc {
    return async (signal?: AbortSignal): Promise<CustomConfigs> => {
        // 提前检查，避免无谓的调用
        if (signal?.aborted) {
            throw signal.reason ?? new DOMException("Aborted", "AbortError");
        }

        // 并行执行所有配置函数
        const results = await Promise.all(configs.map((c) => c(signal)));

        // 合并结果（浅拷贝，不修改原始对象）；null 表示该来源无配置，跳过
        const merged: CustomConfigs = { columns: {} };
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
    return (config: CustomConfigs, signal?: AbortSignal) => {
        localStorage.setItem(key, JSON.stringify(config));
        return Promise.resolve()
    }
}
export function loadLocalStorageConfig(key: string): loadConfigFunc {
    return (signal?: AbortSignal) => {
        const text = localStorage.getItem(key);
        if (text) {
            return Promise.resolve(JSON.parse(text) as CustomConfigs);
        }
        // 尚未保存过 → null（调用方按空配置处理）
        return Promise.resolve(null);
    }
}