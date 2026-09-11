<script setup lang="ts">
import { ref } from "vue";

interface Props {
  name?: string;
}

const props = withDefaults(defineProps<Props>(), {
  name: "Knife",
});

const count = ref(0);
</script>

<template>
  <el-card class="hello-knife" :header="`Hello, ${props.name}`">
    <p class="hello-knife__title">ys.knife.crud component demo</p>
    <el-space>
      <el-button type="primary" @click="count++">click me</el-button>
      <el-tag>clicked: {{ count }}</el-tag>
    </el-space>
    <slot />
  </el-card>
</template>

<style scoped>
.hello-knife {
  max-width: 420px;
}
.hello-knife__title {
  margin: 0 0 12px;
  font-weight: 600;
}
</style>
