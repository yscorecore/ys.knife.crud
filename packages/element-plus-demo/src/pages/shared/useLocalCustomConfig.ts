import { computed } from "vue";
import {
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type loadCustomConfigFunc,
  type saveCustomConfigFunc,
} from "@ys.knife.crud/core";

/**
 * 列设置演示共用：把某个 localStorage key 包装成
 * load/save custom config 的一对 computed（各演示页用独立 key，避免互相覆盖）。
 */
export function useLocalCustomConfig(key: string) {
  const loadCustomConfigFun = computed<loadCustomConfigFunc>(() =>
    loadLocalStorageConfig(key),
  );
  const saveCustomConfigFun = computed<saveCustomConfigFunc>(() =>
    saveLocalStorageConfig(key),
  );

  return { loadCustomConfigFun, saveCustomConfigFun };
}
