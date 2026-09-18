<script setup lang="ts">
import { computed, ref } from "vue";
import HomePage from "./pages/HomePage.vue";
import { demoPageMap, type DemoPageId } from "./demoPages";

// 轻量导航：home（导航页）+ demoPages 注册表中的各演示页。
// 新增 demo 页只需在 demoPages.ts 注册，这里无需改动。
type Page = "home" | DemoPageId;

const currentPage = ref<Page>("home");

function navigate(page: Page) {
  currentPage.value = page;
}

// 非首页时从注册表解析对应组件；所有演示页统一约定 emit "back"
const currentComponent = computed(() =>
  currentPage.value === "home"
    ? null
    : (demoPageMap.get(currentPage.value)?.component ?? null),
);
</script>

<template>
  <HomePage v-if="currentPage === 'home'" @navigate="navigate" />
  <component :is="currentComponent" v-else @back="navigate('home')" />
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #f5f7fa;
}
</style>
