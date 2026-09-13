<script setup lang="ts">
import { computed, ref } from "vue";
import {
  constActions,
  constData,
  constMetaFunc,
  emptyData,
  listData,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type loadConfigFunc,
  type Meta,
  type PageFunc,
  type RowActionsFunc,
  type saveCustomConfigFunc,
  type TableApi,
} from "@ys.knife.crud/core";
import { Table } from "@ys.knife.crud/component-elementplus";
import { ElMessage } from "element-plus";

// 七种演示模式：
// - empty：只加载表头，空数据（emptyData）
// - const：表头 + 固定数据（constData）
// - actions：表头 + 固定数据 + 行操作（constData + constActions）
// - list：表头 + 异步列表数据（listData 包装 ListFunc）
// - paged：表头 + 分页（constData 25 行 + pageSize=10，自动出现分页组件）
// - checkbox：表头 + 固定数据 + 勾选列（showCheckbox，表头 checkbox 全选/取消全选）
// - custom：表头 + 固定数据 + 列设置（showCustomConfig，自定义列显隐/顺序/宽度，localStorage 持久化）
// - combo：勾选列 + 列设置 + 分页组合（showCheckbox + showCustomConfig，验证两者互不干扰）
type Variant = "empty" | "const" | "actions" | "list" | "paged" | "checkbox" | "custom" | "combo";

const props = defineProps<{
  variant: Variant;
}>();

defineEmits<{
  (e: "back"): void;
}>();

// 列元数据：描述表格长什么样（列名、显示名、顺序、是否显示等）
const meta: Meta = {
  displayName: "用户列表",
  description: "Table 组件演示用的元数据",
  columns: [
    {
      propertyPath: "id",
      displayName: "ID",
      description: null,
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "number",
      displayOrder: 0,
      dataSource: null,
      queryFilter: null,
    },
    {
      propertyPath: "name",
      displayName: "姓名",
      description: "用户姓名",
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "string",
      displayOrder: 1,
      dataSource: null,
      queryFilter: null,
    },
    {
      propertyPath: "email",
      displayName: "邮箱",
      description: null,
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "string",
      displayOrder: 2,
      dataSource: null,
      queryFilter: null,
    },
    {
      propertyPath: "age",
      displayName: "年龄",
      description: null,
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "number",
      displayOrder: 3,
      dataSource: null,
      queryFilter: null,
    },
    // 故意设为 showForDisplay: false，验证 Table 会按元数据隐藏该列
    {
      propertyPath: "secret",
      displayName: "隐藏列",
      description: null,
      showForDisplay: false,
      displayFormat: null,
      isArray: false,
      dataTypeName: "string",
      displayOrder: 4,
      dataSource: null,
      queryFilter: null,
    },
  ],
};

// 用 constMetaFunc 把固定元数据包装成 MetaFunc
const metaFun = constMetaFunc(meta);

interface UserRow {
  id: number;
  name: string;
  email: string;
  age: number;
  secret: string;
}

// 数据放在 constData/listData 闭包引用的同一数组里，删除 splice 后 Table reload 能看到最新数据。
// 数组在 setup 内创建，每次进入页面都是全新的一份（删除演示不会污染其他模式）。
const rows: UserRow[] = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 28, secret: "x" },
  { id: 2, name: "Bob", email: "bob@example.com", age: 34, secret: "y" },
  { id: 3, name: "Carol", email: "carol@example.com", age: 25, secret: "z" },
];

// 分页演示用的 25 行数据（pageSize=10 → 3 页）
const manyRows: UserRow[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User${i + 1}`,
  email: `user${i + 1}@example.com`,
  age: 20 + (i % 30),
  secret: `s${i + 1}`,
}));

// 按模式选择数据源：emptyData / constData / listData（listData 包装一个异步 ListFunc）
const dataFun = computed<PageFunc<UserRow>>(() => {
  switch (props.variant) {
    case "empty":
      return emptyData<UserRow>();
    case "list":
      // 模拟异步接口：延迟 300ms 返回整表，listData 再按 PageReq 切片分页
      return listData<UserRow>(
        () => new Promise<UserRow[]>((resolve) => setTimeout(() => resolve(rows), 300)),
      );
    case "paged":
    case "checkbox":
    case "combo":
      return constData(manyRows);
    default:
      return constData(rows);
  }
});

// 每页条数：paged / checkbox / combo 模式用 10（25 行 → 3 页），其余模式保持默认 20（数据不足一页，分页组件自动隐藏）
const pageSize = computed(() =>
  props.variant === "paged" || props.variant === "checkbox" || props.variant === "combo" ? 10 : 20,
);

// 勾选列：checkbox / combo 模式开启
const showCheckbox = computed(() => props.variant === "checkbox" || props.variant === "combo");

// 列设置：custom / combo 模式开启；配置持久化到 localStorage，刷新页面后仍生效。
// combo 用独立 key，避免与 custom 模式互相覆盖配置。
const CUSTOM_CONFIG_KEY = "yk-crud-demo-table-columns";
const COMBO_CONFIG_KEY = "yk-crud-demo-table-columns-combo";
const configKey = computed(() => (props.variant === "combo" ? COMBO_CONFIG_KEY : CUSTOM_CONFIG_KEY));
const showCustomConfig = computed(() => props.variant === "custom" || props.variant === "combo");
const loadCustomConfigFun = computed<loadConfigFunc | undefined>(() =>
  showCustomConfig.value ? loadLocalStorageConfig(configKey.value) : undefined,
);
const saveCustomConfigFun = computed<saveCustomConfigFunc | undefined>(() =>
  showCustomConfig.value ? saveLocalStorageConfig(configKey.value) : undefined,
);

// checkbox 模式：通过 Table expose 的 selectedRows 查看当前选中行。
// ref 直接用 core 的输出契约 TableApi 类型化，不依赖组件 SFC 的 InstanceType
const tableRef = ref<TableApi | null>(null);

function showSelection(): void {
  const selected = (tableRef.value?.selectedRows ?? []) as UserRow[];
  if (selected.length === 0) {
    ElMessage.warning("尚未选中任何行");
    return;
  }
  ElMessage.success(`已选中 ${selected.length} 行：${selected.map((r) => r.name).join("、")}`);
}

// 行操作：仅 actions 模式提供；存在 rowActionsFunc 时，Table 会在每一行最后一列显示这些操作
const rowActionsFunc = computed<RowActionsFunc<UserRow> | undefined>(() => {
  if (props.variant !== "actions") return undefined;
  return constActions<UserRow>(
    {
      name: "edit",
      desc: "编辑",
      execute: (item) => {
        ElMessage.info(`编辑：${item.name}（${item.email}）`);
        return Promise.resolve();
      },
    },
    {
      name: "delete",
      desc: "删除",
      // 演示 show：首行（Alice）受保护，不显示删除按钮
      show: (item) => item.id !== 1,
      execute: (item) => {
        const i = rows.findIndex((r) => r.id === item.id);
        if (i >= 0) rows.splice(i, 1);
        ElMessage.success(`已删除：${item.name}`);
        return Promise.resolve();
      },
    },
  );
});

// 每种模式的标题与说明
const text = computed(() => {
  switch (props.variant) {
    case "empty":
      return {
        title: "空数据表格",
        hint: "只加载表头：metaFun 由 constMetaFunc 提供，dataFun 由 emptyData() 提供（items 为空数组），不显示操作列。",
      };
    case "const":
      return {
        title: "固定数据表格",
        hint: "表头 + const 数据：dataFun 由 constData(rows) 提供，返回固定数组的分页切片，不显示操作列。",
      };
    case "actions":
      return {
        title: "带行操作的表格",
        hint: "表头 + const 数据 + 行操作：rowActionsFunc 由 constActions 提供，最后一列显示「编辑 / 删除」；首行因 show 条件不显示「删除」，删除后 Table 自动 reload。",
      };
    case "list":
      return {
        title: "异步列表数据表格",
        hint: "表头 + listData：listData 把一个异步 ListFunc（模拟 300ms 延迟的接口）包装成 PageFunc，由它完成分页切片。",
      };
    case "paged":
      return {
        title: "分页表格",
        hint: "25 行数据 + pageSize=10：数据超过一页，表格下方自动显示分页组件；翻页或切换「每页条数」（10 / 20 / 50 / 100）时，Table 会以对应的 limit/offset 重新调用 dataFun，切换条数后回到第一页。",
      };
    case "checkbox":
      return {
        title: "可勾选表格",
        hint: "showCheckbox 开启后第一列变为 checkbox（reserve-selection 按行 key 跨页保留选中，翻页不丢）；表头 checkbox 全选 / 取消全选当前页；有选中时表格上方显示「已选 N 项 · 清空」。25 行数据 + pageSize=10，可跨页勾选后点「查看选中」验证。",
      };
    case "custom":
      return {
        title: "自定义列表格",
        hint: "showCustomConfig 开启后表格右上出现「⚙ 列设置」：可勾选列的显隐、用上移/下移调整顺序、输入列宽，保存后立即生效并经 localStorage 持久化（刷新页面仍在）。候选列来自 meta 中 showForDisplay=true 的列，隐藏列不会出现。",
      };
    case "combo":
      return {
        title: "可勾选 + 自定义列表格",
        hint: "showCheckbox 与 showCustomConfig 同时开启：第一列是 checkbox（跨页保留选中），右上「⚙ 列设置」调整数据列的显隐/顺序/宽度——勾选列固定在第一列，不参与列设置。25 行数据 + pageSize=10，配置独立持久化（与自定义列 demo 互不覆盖）。",
      };
  }
});
</script>

<template>
  <main class="container">
    <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>

    <h1>{{ text.title }}</h1>
    <p class="hint">
      {{ text.hint }}
      <code>secret</code> 列因 <code>showForDisplay: false</code> 被隐藏。
    </p>

    <div v-if="showCheckbox" class="toolbar">
      <el-button type="primary" @click="showSelection">查看选中</el-button>
    </div>

    <Table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :row-actions-func="rowActionsFunc"
      :page-size="pageSize"
      :show-checkbox="showCheckbox"
      :show-custom-config="showCustomConfig"
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
    />
  </main>
</template>

<style scoped>
.container {
  max-width: 860px;
  margin: 32px auto;
  padding: 24px;
}
h1 {
  margin: 16px 0 8px;
}
.hint {
  color: #666;
  font-size: 0.92em;
  line-height: 1.6;
  margin-bottom: 16px;
}
.toolbar {
  margin-bottom: 12px;
}
code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
