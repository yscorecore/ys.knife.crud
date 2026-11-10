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
  compiler: {
    type: "webpack5",
    prebundle: {
      // 依赖预打包（esbuild）会把库编译成 opaque JS，Taro 模板编译器扫不到库模板里的
      // scroll-view / input 等原生组件，导致这些组件不生成 WXML、滚动失效。
      // 排除本库及其工作区依赖，交给 webpack + vue-loader 逐文件编译库的 .vue 源码。
      exclude: ["@ys-knife-crud/taro", "@ys-knife-crud/core"],
    },
  },
  framework: "vue3",
  // esnextModules 决定 H5 端哪些依赖参与 babel 转译；小程序端不读这个字段（见下方 mini）。
  esnextModules: ["@ys-knife-crud/taro"],
  // 小程序端的 script(babel) 规则 include 由 MiniWebpackModule.getScriptRule 决定：
  //   [sourceDir, filename => /(?<=node_modules[\\/]).*taro/.test(filename)]
  // 本库与 core 通过 pnpm workspace 链接进来，webpack 默认 resolve.symlinks=true
  // 会把它们解析成真实路径 packages/<name>/...，路径里没有 node_modules，
  // 内置正则匹配不上，于是库内 .vue
  // 的 <script> 不会过 babel —— TS 语法（如 `type PropType`）原样漏给 webpack，
  // 报 ModuleParseError。所以用 webpackChain 显式把这两个包的目录加入 include。
  // 注意：Taro 4.3.1 传进来的 chain 对象没有 webpack-chain 的标准方法（
  // module.rule() / rules.keys() 均不存在），只能到底层的 rules.store 操作。
  mini: {
    webpackChain(chain: any) {
      chain.module.rules.store
        .get("script")
        .include.add(/[\\/]packages[\\/](taro|core)[\\/]/);
    },
  },
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  h5: {},
});
