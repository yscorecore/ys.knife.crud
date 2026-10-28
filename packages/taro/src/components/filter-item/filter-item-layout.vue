<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi } from "@ys-knife-crud/core";
import { useFilterPanelItem } from "../filter-panel/context";

defineOptions({ name: "YsFilterItemLayout" });

/**
 * YsFilterItemLayout（小程序版）—— FilterItem 统一外壳
 *
 * 对齐 @ys-knife-crud/element-plus 的 YsFilterItemLayout，把各 FilterItem 共有的
 * 「label + 控件容器 + 样式 + 面板注册」抽出来：
 *   1. 具体 FilterItem 调自己的 composable 拿到 { value, filter, reset }
 *   2. 组装稳定 api 对象（filter 用 getter 读 computed.value）
 *   3. 把 api 与 label 传进本组件，控件通过默认插槽注入
 *
 * 注册/反注册复用 @ys-knife-crud/taro 自己的 useFilterPanelItem（inject FilterPanelKey），
 * 不依赖 element-plus 的 YsFilterItemLayout。
 *
 * 元素约束：只用小程序内置元素（view / text / input / picker），不使用 div/label。
 */
const props = defineProps({
  /** 控件上方的标签文本；空串时不渲染 */
  label: { type: String, default: "" },
  /** FilterItem 的 API 对象，由 layout 注册到最近的 YsFilterPanel */
  api: { type: Object as PropType<FilterItemApi>, required: true },
});

useFilterPanelItem(props.api);
</script>

<template>
  <view class="yk-filter-item">
    <text v-if="label" class="yk-filter-item__label">{{ label }}</text>
    <view class="yk-filter-item__control">
      <slot />
    </view>
  </view>
</template>

<style lang="scss">
/* 外壳：纵向「标签 + 控件」，铺满条件区宽度（条件区本身是纵向 flex 列） */
.yk-filter-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8rpx;
  box-sizing: border-box;
}

.yk-filter-item__label {
  font-size: 22rpx;
  line-height: 1.4;
  color: #909399;
}

.yk-filter-item__control {
  display: flex;
  align-items: center;
  width: 100%;
}

/* ---------------- 各 FilterItem 共用的控件样式 ---------------- */

/* 输入框 / 选择器外容器：浅灰底 + 圆角，高度与面板顶部输入框一致（64rpx） */
.yk-filter-item__field {
  flex: 1;
  min-width: 0;
  height: 64rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  background-color: #f2f3f5;
  border-radius: 8rpx;
  overflow: hidden;
}

.yk-filter-item__input {
  width: 100%;
  height: 100%;
  font-size: 26rpx;
  line-height: 64rpx;
  color: #303133;
  background-color: transparent;
}

.yk-filter-item__placeholder {
  color: #909399;
}

/* 日期/枚举选择器：picker 本身只做触发器（撑开剩余宽度），视觉放在内部 view 上 */
.yk-filter-item__picker-trigger {
  flex: 1;
  min-width: 0;
}

/* 日期选择器触发器（picker 本身不可直接设样式，内部放一个 view 承载视觉） */
.yk-filter-item__picker {
  width: 100%;
  display: flex;
  align-items: center;
  height: 64rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  background-color: #f2f3f5;
  border-radius: 8rpx;
  overflow: hidden;
}

.yk-filter-item__picker-text {
  font-size: 26rpx;
  line-height: 1;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.yk-filter-item__picker-text--placeholder {
  color: #909399;
}

/* 单个条件清除按钮 */
.yk-filter-item__clear {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #c0c4cc;
}

/* 日期区间的「至」分隔符 */
.yk-filter-item__sep {
  flex-shrink: 0;
  padding: 0 12rpx;
  font-size: 24rpx;
  color: #909399;
}

/* 枚举多选：标签式选项，点击切换选中 */
.yk-filter-item__chips {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: 12rpx;
}

.yk-filter-item__chip {
  padding: 8rpx 20rpx;
  box-sizing: border-box;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  background-color: #ffffff;
  font-size: 24rpx;
  line-height: 1.2;
  color: #606266;
}

.yk-filter-item__chip--active {
  border-color: #d9ecff;
  background-color: #ecf5ff;
  color: #409eff;
}

.yk-filter-item__chips-empty {
  font-size: 26rpx;
  color: #909399;
}
</style>
