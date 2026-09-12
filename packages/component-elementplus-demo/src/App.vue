<script setup lang="ts">
import { ref } from "vue";
import HomePage from "./pages/HomePage.vue";
import TableDemoPage from "./pages/TableDemoPage.vue";

// 轻量导航：目前只有 home（导航页）与 table（Table Demo）两个页面。
// 后续新增 demo 页时，扩展此 union 类型并在 HomePage 加一个按钮即可。
type Page = "home" | "table";

const currentPage = ref<Page>("home");

function navigate(page: Page) {
  currentPage.value = page;
}
</script>

<template>
  <HomePage v-if="currentPage === 'home'" @navigate="navigate" />
  <TableDemoPage v-else-if="currentPage === 'table'" @back="navigate('home')" />
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #f5f7fa;
}
</style>
