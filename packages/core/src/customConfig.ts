
export interface CustomColumnConfig {
    propertyPath: string,
    visible: boolean,
    order: number,
    width: string,
}

export type CustomColumnConfigs = Record<string, CustomColumnConfig>;

/** 加载列自定义配置；返回 null 表示「尚未保存过配置」，调用方按空配置处理 */
export type loadConfigFunc = (signal?: AbortSignal) => Promise<CustomColumnConfigs | null>

export type saveCustomConfigFunc = (config: CustomColumnConfigs, signal?: AbortSignal) => Promise<void>

export function constConfig(config: CustomColumnConfigs): loadConfigFunc {
    return () => Promise.resolve(config);
}
export function emptyConfig(): loadConfigFunc {
    return constConfig({});
}
export function mergeConfigs(...configs: loadConfigFunc[]): loadConfigFunc {
    return async (signal?: AbortSignal): Promise<CustomColumnConfigs> => {
        // 提前检查，避免无谓的调用
        if (signal?.aborted) {
            throw signal.reason ?? new DOMException("Aborted", "AbortError");
        }

        // 并行执行所有配置函数
        const results = await Promise.all(configs.map((c) => c(signal)));

        // 合并结果（浅拷贝，不修改原始对象）；null 表示该来源无配置，跳过
        const merged: CustomColumnConfigs = {};
        for (const result of results) {
            if (!result) continue;
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

export function saveLocalStorageConfig(key: string): saveCustomConfigFunc {
    return (config: CustomColumnConfigs, signal?: AbortSignal) => {
        localStorage.setItem(key, JSON.stringify(config));
        return Promise.resolve()
    }
}
export function loadLocalStorageConfig(key: string): loadConfigFunc {
    return (signal?: AbortSignal) => {
        const text = localStorage.getItem(key);
        if (text) {
            return Promise.resolve(JSON.parse(text) as CustomColumnConfigs);
        }
        // 尚未保存过 → null（调用方按空配置处理）
        return Promise.resolve(null);
    }
}