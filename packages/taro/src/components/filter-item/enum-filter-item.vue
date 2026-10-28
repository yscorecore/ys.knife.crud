<script setup lang="ts">
import { computed, onMounted, ref, type PropType } from "vue";
import type {
  EnumOption,
  EnumOptionsSource,
  FilterItemApi,
  Operator,
} from "@ys-knife-crud/core";
import { useEnumFilterItem, type EnumFilterItemProps } from "./use-filter-item";
import YsFilterItemLayout from "./filter-item-layout.vue";

defineOptions({ name: "YsEnumFilterItem" });

/**
 * YsEnumFilterItem（小程序版）—— 枚举单字段查询条件，支持单选 / 多选
 *
 * 对齐 element-plus 的 YsEnumFilterItem（el-select），逻辑复用 @ys-knife-crud/vue 的
 * useEnumFilterItem，视图换成小程序原生元素：
 *
 * - 单选（multiple=false，默认）：`<picker mode="selector">`，使用声明方指定的 op（常为 Equals）
 * - 多选（multiple=true）：小程序没有原生多选选择器，改用标签式选项（点击切换），
 *   op 由 composable 自动派生：0 项 → null，1 项 → Equals，2+ 项 → In
 * - optionsSource：函数类型，返回 Promise<EnumOption[]>；onMounted 加载一次，
 *   用 opt.value 作选中值、opt.label 作显示文本
 * - clearable 为 true 时单选模式显示清除按钮（多选逐项取消即可）
 * - 消费方需在页面模板占位 `<picker v-if="false" />`，否则 Taro 不会登记该原生组件
 */
const props = defineProps({
  /** 控件上方的标签 */
  label: { type: String, default: "" },
  /** 运算符；仅单选模式使用（多选模式按 1 项→Equals、2+ 项→In 自动派生） */
  op: { type: String as PropType<Operator>, required: true },
  /** 实体属性路径（FilterInfo.left），如 "status" / "user.roleId" */
  propertyPath: { type: String, required: true },
  /** 初始值；单选为 string | number | null，多选为 (string | number)[] */
  defaultValue: {
    type: [String, Number, Array] as unknown as PropType<EnumFilterItemProps["defaultValue"]>,
    default: undefined,
  },
  /** 占位文本 */
  placeholder: { type: String, default: "请选择" },
  /** 选项数据源，返回 { label, value } 数组 */
  optionsSource: { type: Function as PropType<EnumOptionsSource>, required: true },
  /** 是否多选；多选时用标签式选项渲染 */
  multiple: { type: Boolean, default: false },
  /** 单选模式是否显示清除按钮 */
  clearable: { type: Boolean, default: true },
});

const { value, filter: filterInfo, reset } = useEnumFilterItem(props);

/* 选项数据：onMounted 调用一次 optionsSource()，loading 控制占位文案 */
const options = ref<EnumOption[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    options.value = await props.optionsSource();
  } finally {
    loading.value = false;
  }
});

/* ---------------- 单选 ---------------- */

/** picker 的 value 是下标；未选中时返回 -1，模板里再夹到 0 */
const selectedIndex = computed<number>(() => {
  const v = Array.isArray(value.value) ? null : value.value;
  if (v == null) return -1;
  return options.value.findIndex((opt) => String(opt.value) === String(v));
});

/** 选中项显示文本；未匹配到选项时显示空串（回落到占位文本） */
const selectedLabel = computed<string>(() => {
  const index = selectedIndex.value;
  return index >= 0 ? (options.value[index]?.label ?? "") : "";
});

function onSelectChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string | number } }).detail;
  const index = Number(detail?.value ?? -1);
  const opt = options.value[index];
  // EnumOption.value 允许 boolean（如启用/禁用枚举），值逻辑里按 string|number 处理，
  // 运行时 con 只做包装，布尔值同样可用
  if (opt) value.value = opt.value as unknown as string | number;
}

function onClear(): void {
  value.value = null;
}

/* ---------------- 多选 ---------------- */

const multiValues = computed<(string | number)[]>(() =>
  Array.isArray(value.value) ? value.value : [],
);

function isActive(opt: EnumOption): boolean {
  return multiValues.value.some((v) => String(v) === String(opt.value));
}

/** 点击标签切换选中状态 */
function toggle(opt: EnumOption): void {
  const next = [...multiValues.value];
  const index = next.findIndex((v) => String(v) === String(opt.value));
  if (index >= 0) next.splice(index, 1);
  else next.push(opt.value as unknown as string | number);
  value.value = next;
}

/* filter 用 getter 读 computed.value，使面板端的聚合 computed 能 track 到值变化 */
const api = {
  get filter() {
    return filterInfo.value;
  },
  reset,
} as unknown as FilterItemApi;

defineExpose(api);
</script>

<template>
  <YsFilterItemLayout :label="label" :api="api">
    <!-- 多选：标签式选项 -->
    <view v-if="multiple" class="yk-filter-item__chips">
      <text v-if="loading" class="yk-filter-item__chips-empty">加载中…</text>
      <template v-else>
        <view
          v-for="opt in options"
          :key="String(opt.value)"
          class="yk-filter-item__chip"
          :class="{ 'yk-filter-item__chip--active': isActive(opt) }"
          @tap="toggle(opt)"
        >
          <text>{{ opt.label }}</text>
        </view>
      </template>
    </view>

    <!-- 单选：原生选择器 -->
    <template v-else>
      <picker
        class="yk-filter-item__picker-trigger"
        mode="selector"
        :range="options"
        range-key="label"
        :value="selectedIndex < 0 ? 0 : selectedIndex"
        @change="onSelectChange"
      >
        <view class="yk-filter-item__picker">
          <text
            class="yk-filter-item__picker-text"
            :class="{ 'yk-filter-item__picker-text--placeholder': !selectedLabel }"
          >{{ loading ? "加载中…" : selectedLabel || placeholder }}</text>
        </view>
      </picker>

      <view
        v-if="clearable && selectedLabel"
        class="yk-filter-item__clear"
        @tap.stop="onClear"
      >
        <text>✕</text>
      </view>
    </template>
  </YsFilterItemLayout>
</template>
