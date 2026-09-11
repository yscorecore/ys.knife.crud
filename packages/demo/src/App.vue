<script setup lang="ts">
import { HelloKnife } from "@ys.knife.crud/component-elementplus";
</script>

<template>
  <main class="container">
    <h1>ys.knife.crud demo</h1>
    <p class="lead">
      Demo app for <code>@ys.knife.crud/component-elementplus</code>.
      Local development only — this package is marked <code>private</code> and never published to npm.
    </p>
    <HelloKnife name="element-plus">
      <p>Welcome — this card is rendered by our component library.</p>
    </HelloKnife>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #f5f7fa;
}
.container {
  max-width: 760px;
  margin: 32px auto;
  padding: 24px;
}
.lead {
  color: #666;
}
code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
