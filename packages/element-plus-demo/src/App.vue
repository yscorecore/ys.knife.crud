<script setup lang="ts">
import { ref } from "vue";
import HomePage from "./pages/HomePage.vue";
import EmptyTablePage from "./pages/table/EmptyTablePage.vue";
import ConstTablePage from "./pages/table/ConstTablePage.vue";
import ActionsTablePage from "./pages/table/ActionsTablePage.vue";
import ListTablePage from "./pages/table/ListTablePage.vue";
import PagedTablePage from "./pages/table/PagedTablePage.vue";
import CheckboxTablePage from "./pages/table/CheckboxTablePage.vue";
import CustomTablePage from "./pages/table/CustomTablePage.vue";
import ComboTablePage from "./pages/table/ComboTablePage.vue";
import ExportTablePage from "./pages/table/ExportTablePage.vue";
import CustomExportTablePage from "./pages/table/CustomExportTablePage.vue";

// 轻量导航：home（导航页）+ 十个 Table Demo 模式页，每个模式一个独立页面文件。
// 后续新增 demo 页时，扩展此 union 类型、在 pages/table/ 加一个页面并在 HomePage 加按钮即可。
type Page =
  | "home"
  | "table-empty"
  | "table-const"
  | "table-actions"
  | "table-list"
  | "table-paged"
  | "table-checkbox"
  | "table-custom"
  | "table-combo"
  | "table-export"
  | "table-custom-export";

const currentPage = ref<Page>("home");

function navigate(page: Page) {
  currentPage.value = page;
}
</script>

<template>
  <HomePage v-if="currentPage === 'home'" @navigate="navigate" />
  <EmptyTablePage v-else-if="currentPage === 'table-empty'" @back="navigate('home')" />
  <ConstTablePage v-else-if="currentPage === 'table-const'" @back="navigate('home')" />
  <ActionsTablePage v-else-if="currentPage === 'table-actions'" @back="navigate('home')" />
  <ListTablePage v-else-if="currentPage === 'table-list'" @back="navigate('home')" />
  <PagedTablePage v-else-if="currentPage === 'table-paged'" @back="navigate('home')" />
  <CheckboxTablePage v-else-if="currentPage === 'table-checkbox'" @back="navigate('home')" />
  <CustomTablePage v-else-if="currentPage === 'table-custom'" @back="navigate('home')" />
  <ComboTablePage v-else-if="currentPage === 'table-combo'" @back="navigate('home')" />
  <ExportTablePage v-else-if="currentPage === 'table-export'" @back="navigate('home')" />
  <CustomExportTablePage
    v-else-if="currentPage === 'table-custom-export'"
    @back="navigate('home')"
  />
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #f5f7fa;
}
</style>
