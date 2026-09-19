<!-- 文章列表面板：YsTable（页面内自定义 Meta，列宽可拖动并持久化） -->
<script setup lang="ts">
import { constData, constMetaFunc, loadLocalStorageConfig, saveLocalStorageConfig, type Meta } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";

interface PostRow {
  id: number;
  title: string;
  author: string;
  views: number;
  published: string;
}

const postRows: PostRow[] = [
  { id: 1, title: "Vue 3 组合式 API 实战", author: "张三", views: 1280, published: "已发布" },
  { id: 2, title: "Element Plus 表格深度定制", author: "李四", views: 980, published: "已发布" },
  { id: 3, title: "Vite 插件开发入门", author: "王五", views: 640, published: "草稿" },
  { id: 4, title: "TypeScript 类型体操指南", author: "赵六", views: 2100, published: "已发布" },
  { id: 5, title: "前端监控体系搭建", author: "张三", views: 1560, published: "已发布" },
  { id: 6, title: "微前端方案对比", author: "孙七", views: 430, published: "草稿" },
  { id: 7, title: "CSS 容器查询实践", author: "李四", views: 720, published: "已发布" },
  { id: 8, title: "Web 性能优化清单", author: "王五", views: 1890, published: "已发布" },
];

const postMeta: Meta = {
  displayName: "文章",
  description: "文章表",
  columns: [
    { propertyPath: "title", displayName: "标题", showForDisplay: true, displayOrder: 1 },
    { propertyPath: "author", displayName: "作者", showForDisplay: true, displayOrder: 2 },
    { propertyPath: "views", displayName: "浏览量", showForDisplay: true, displayOrder: 3 },
    { propertyPath: "published", displayName: "状态", showForDisplay: true, displayOrder: 4 },
  ],
};

const postMetaFun = constMetaFunc(postMeta);
const postDataFun = constData<PostRow>(postRows);
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-admin-posts");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-admin-posts");
</script>

<template>
  <ys-table :meta-fun="postMetaFun" :data-fun="postDataFun" :page-size="8"
    :load-custom-config-fun="loadCustomConfigFun" :save-custom-config-fun="saveCustomConfigFun" />
</template>
