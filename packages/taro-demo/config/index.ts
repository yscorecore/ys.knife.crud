import { defineConfig } from "@tarojs/cli";

export default defineConfig({
  projectName: "taro-demo",
  date: "2026-10-27",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: "src",
  outputRoot: "dist",
  compiler: "webpack5",
  framework: "vue3",
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  mini: {},
  h5: {},
});
