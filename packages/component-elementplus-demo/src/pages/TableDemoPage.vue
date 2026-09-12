<script setup lang="ts">
import { computed } from "vue";
import {
  constActions,
  constData,
  constMetaFunc,
  emptyData,
  listData,
  type Meta,
  type PageFunc,
  type RowActionsFunc,
} from "@ys.knife.crud/core";
import { Table } from "@ys.knife.crud/component-elementplus";
import { ElMessage } from "element-plus";

// 四种演示模式：
// - empty：只加载表头，空数据（emptyData）
// - const：表头 + 固定数据（constData）
// - actions：表头 + 固定数据 + 行操作（constData + constActions）
// - list：表头 + 异步列表数据（listData 包装 ListFunc）
type Variant = "empty" | "const" | "actions" | "list";

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
    default:
      return constData(rows);
  }
});

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

    <Table :meta-fun="metaFun" :data-fun="dataFun" :row-actions-func="rowActionsFunc" />
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
code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
