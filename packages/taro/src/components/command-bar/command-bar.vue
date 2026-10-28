<script setup lang="ts">
import { computed, ref, type PropType } from "vue";
import type { TableAction } from "@ys-knife-crud/core";

/**
 * YsCommandBar（小程序版）—— 命令面板（空壳子）
 *
 * 只负责一个流式 flex 容器：
 * - 左侧：按 actions 数据驱动渲染命令按钮（desc + type + plain），点击调 execute()
 * - 默认插槽：追加外部自定义内容
 *
 * 不内置任何按钮（刷新、选中提示条等都由外部自己塞到插槽里）。
 *
 * 元素约束：只用小程序内置元素（view / text），不使用 div。
 */
defineOptions({ name: "YsCommandBar" });

const props = defineProps({
  /** 表级命令列表，每条渲染为一个按钮；空数组时左侧命令区不渲染 */
  actions: {
    type: Array as PropType<TableAction[]>,
    default: () => [],
  },
  /** 外部自定义样式：追加到根节点上的类名 */
  customClass: { type: String, default: "" },
  /** 外部自定义样式：追加到根节点上的内联样式字符串 */
  customStyle: { type: String, default: "" },
});

/** 命令按钮点击：调 execute()，不捕获异常——由外部 action 自己处理 */
async function onActionClick(action: TableAction): Promise<void> {
  try {
    await action.execute(undefined as unknown as import("@ys-knife-crud/core").TableApi);
  } catch (e) {
    console.error("[YsCommandBar] action failed:", action.name, e);
  }
}
</script>

<template>
  <view :class="['yk-command-bar', customClass]" :style="customStyle">
    <template v-if="actions.length > 0">
      <view
        v-for="action in actions"
        :key="action.name"
        class="yk-command-bar__btn"
        :class="[
          action.type ? `yk-command-bar__btn--${action.type}` : 'yk-command-bar__btn--default',
          { 'yk-command-bar__btn--plain': action.plain },
        ]"
        @tap="onActionClick(action)"
      >
        <text class="yk-command-bar__btn-text">{{ action.desc }}</text>
      </view>
    </template>

    <slot />
  </view>
</template>

<style lang="scss">
/* 命令面板容器：flex 流式布局，宽度不足时整体换行
   非 scoped + BEM 前缀（小程序端 scoped 支持有限，以前缀约定防泄漏） */
.yk-command-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx 20rpx;
  padding: 16rpx 24rpx;
}

/* 命令按钮基类：自绘 view，不用原生 button（小程序 button 默认有 padding/边框/line-height 干扰） */
.yk-command-bar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 64rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  border-radius: 8rpx;
  font-size: 28rpx;
  line-height: 1;
}

.yk-command-bar__btn-text {
  font-size: 28rpx;
  line-height: 1;
}

/* type 变体：primary / success / warning / danger / default */
.yk-command-bar__btn--primary {
  color: #ffffff;
  background-color: #409eff;
}
.yk-command-bar__btn--success {
  color: #ffffff;
  background-color: #67c23a;
}
.yk-command-bar__btn--warning {
  color: #ffffff;
  background-color: #e6a23c;
}
.yk-command-bar__btn--danger {
  color: #ffffff;
  background-color: #f56c6c;
}
.yk-command-bar__btn--default {
  color: #606266;
  background-color: #ffffff;
  border: 2rpx solid #dcdfe6;
}

/* plain 变体：主色文字 + 浅底 + 细边框（比实心按钮轻量） */
.yk-command-bar__btn--plain.yk-command-bar__btn--primary {
  color: #409eff;
  background-color: #ecf5ff;
  border: 2rpx solid #d9ecff;
}
.yk-command-bar__btn--plain.yk-command-bar__btn--success {
  color: #67c23a;
  background-color: #f0f9eb;
  border: 2rpx solid #e1f3d8;
}
.yk-command-bar__btn--plain.yk-command-bar__btn--warning {
  color: #e6a23c;
  background-color: #fdf6ec;
  border: 2rpx solid #faecd8;
}
.yk-command-bar__btn--plain.yk-command-bar__btn--danger {
  color: #f56c6c;
  background-color: #fef0f0;
  border: 2rpx solid #fde2e2;
}
</style>
