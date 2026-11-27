<script setup lang="ts">
import { computed, toRef } from "vue";
import { useCollectData } from "@ys-knife-crud/vue";
import type {
  CollectorFunc,
  Column,
  PageFunc,
} from "@ys-knife-crud/core";

/**
 * 收集数据对话框组：包含两个弹窗
 * 1. 范围选择对话框（多个可用选项时才弹出）
 * 2. 「收集所有」进度对话框（循环拉取数据期间显示，可中途取消；取消后不回调）
 *
 * 组件自管收集流：内部调用 useCollectData 拥有全部对话框可见性、进度状态与动作，
 * table.vue 只需传入数据输入并经 ref 调 openCollectDialog() 触发收集入口。
 * 收集完成后由 useCollectData 调 collectorFunc 把原始行对象数组交给外部处理。
 */
const props = defineProps<{
  /** 分页数据源（收集所有时逐页拉取） */
  dataFun: PageFunc<unknown>;
  /** 对话框标题；该能力是通用「取数」通道，可按业务语义自定义，如「打印出库」 */
  collectorTitle?: string;
  /** 收集完成回调；未传时该能力不可用 */
  collectorFunc?: CollectorFunc;
  /** 收集所有时分页拉取的步长（独立于界面分页大小） */
  collectPageSize: number;
  /** 单次收集条数上限 */
  maxCollectCount: number;
  /** 当前页行数据 */
  currentRows: Record<string, unknown>[];
  /** checkbox 列当前选中的行（跨页累计） */
  selectedRows: unknown[];
  /** 数据总条数（驱动进度条初始分母；响应中带回 totalCount 时会被修正） */
  total: number;
  /** 总条数是否已知；已知时「所有数据」选项显示总条数 */
  totalKnown: boolean;
  /** 是否还有下一页（决定「所有数据」选项是否出现） */
  hasMorePage: boolean;
  /** 父级是否启用勾选列——决定「选中」选项是否出现 */
  selectable: boolean;
  /** 界面列定义：openCollectDialog({format:true}) 时据此对声明了 formatter 的列做值转换 */
  columns: Column[];
  /** 「page」范围的文案前缀；缺省「收集当前页数据」 */
  pageScopeLabel?: string;
}>();

const {
  collectOptions,
  collectDialogVisible,
  collecting,
  collectFetched,
  collectTotal,
  collectTotalKnown,
  collectEtaSeconds,
  collectPercent,
  onCollectClick,
  doCollect,
  cancelCollect,
} = useCollectData({
  props, // reactive — dataFun/collectorFunc/maxCollectCount 自动追踪
  selectable: toRef(props, "selectable"),
  currentRows: toRef(props, "currentRows"),
  selectedRows: toRef(props, "selectedRows"),
  total: toRef(props, "total"),
  totalKnown: toRef(props, "totalKnown"),
  collectPageSize: toRef(props, "collectPageSize"),
  hasMorePage: toRef(props, "hasMorePage"),
  columns: toRef(props, "columns"),
  pageScopeLabel: toRef(props, "pageScopeLabel"),
});

/** 剩余时间文案：不足 1 分钟显示「N 秒」，否则「M 分 S 秒」；总数未知时不显示 */
const collectEtaText = computed(() => {
  const s = collectEtaSeconds.value;
  if (s == null) return null;
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m} 分 ${r} 秒` : `${m} 分`;
});

defineExpose({ openCollectDialog: onCollectClick });
</script>

<template>
  <!-- 范围选择对话框 -->
  <el-dialog
    v-model="collectDialogVisible"
    :title="props.collectorTitle ?? '收集数据'"
    width="420px"
  >
    <div class="collect-options">
      <el-button
        v-for="opt in collectOptions"
        :key="opt.value"
        class="collect-option"
        :data-scope="opt.value"
        :disabled="opt.disabled"
        @click="doCollect(opt.value)"
      >
        {{ opt.label }}
      </el-button>
    </div>
    <p class="collect-limit-hint">
      单次最多 {{ props.maxCollectCount }} 条，超出将被截断。
    </p>
  </el-dialog>

  <!-- 「收集所有」进度对话框 -->
  <el-dialog
    v-model="collecting"
    title="正在处理数据"
    width="420px"
    :close-on-click-modal="false"
    :show-close="false"
  >
    <el-progress :percentage="collectPercent" />
    <p class="collect-progress-text">
      已处理 {{ collectFetched }}<template v-if="collectTotalKnown"> / {{ collectTotal }}</template> 条<template v-if="collectEtaText">，预计剩余约 {{ collectEtaText }}</template>
    </p>
    <template #footer>
      <el-button class="collect-cancel" @click="cancelCollect">取消</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.collect-options {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.collect-options .collect-option {
  margin-left: 0;
}
.collect-limit-hint {
  margin: 12px 0 0;
  color: #999;
  font-size: 0.85em;
}
.collect-progress-text {
  margin: 10px 0 0;
  color: #666;
  font-size: 0.92em;
  text-align: center;
}
</style>
