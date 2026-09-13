<script setup lang="ts">
import { ref } from "vue";
import HomePage from "./pages/HomePage.vue";
import TableDemoPage from "./pages/TableDemoPage.vue";

// 轻量导航：home（导航页）+ 八个 Table Demo 模式页。
// 后续新增 demo 页时，扩展此 union 类型并在 HomePage 加一个按钮即可。
type Page = "home" | "table-empty" | "table-const" | "table-actions" | "table-list" | "table-paged" | "table-checkbox" | "table-custom" | "table-combo";

const currentPage = ref<Page>("home");

function navigate(page: Page) {
  currentPage.value = page;
}
</script>

<template>
  <HomePage v-if="currentPage === 'home'" @navigate="navigate" />
  <TableDemoPage v-else-if="currentPage === 'table-empty'" variant="empty" @back="navigate('home')" />
  <TableDemoPage v-else-if="currentPage === 'table-const'" variant="const" @back="navigate('home')" />
  <TableDemoPage v-else-if="currentPage === 'table-actions'" variant="actions" @back="navigate('home')" />
  <TableDemoPage v-else-if="currentPage === 'table-list'" variant="list" @back="navigate('home')" />
  <TableDemoPage v-else-if="currentPage === 'table-paged'" variant="paged" @back="navigate('home')" />
  <TableDemoPage v-else-if="currentPage === 'table-checkbox'" variant="checkbox" @back="navigate('home')" />
  <TableDemoPage v-else-if="currentPage === 'table-custom'" variant="custom" @back="navigate('home')" />
  <TableDemoPage v-else-if="currentPage === 'table-combo'" variant="combo" @back="navigate('home')" />
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #f5f7fa;
}
</style>
