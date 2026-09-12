<script setup lang="ts">
import { constMetaFunc, type Meta } from "@ys.knife.crud/core";
import { Table } from "@ys.knife.crud/component-elementplus";

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

const rows = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 28, secret: "x" },
  { id: 2, name: "Bob", email: "bob@example.com", age: 34, secret: "y" },
  { id: 3, name: "Carol", email: "carol@example.com", age: 25, secret: "z" },
];
</script>

<template>
  <main class="container">
    <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>

    <h1>Table 组件</h1>
    <p class="hint">
      由 <code>metaFun</code> 驱动的表格：列定义（含显隐、顺序）来自
      <code>constMetaFunc</code> 返回的元数据，<code>secret</code> 列因
      <code>showForDisplay: false</code> 被自动隐藏。
    </p>

    <Table :meta-fun="metaFun" :data="rows" />
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
