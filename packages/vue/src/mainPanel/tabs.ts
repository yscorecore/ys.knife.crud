import { defineAsyncComponent, ref, type Component } from "vue";
import type { FunctionNode, MainPanelProps } from "@ys.knife.crud/core";

/**
 * 主面板选项卡（运行时结构）：由功能树叶子节点打开时生成。
 */
export interface MainPanelTab {
  /** 选项卡 key = 叶子节点 key */
  key: string;
  /** 选项卡文案（含 icon 前缀） */
  label: string;
  /** 要渲染的组件路径字符串（空表示叶子未声明 component，渲染为空） */
  componentPath: string;
  /** 渲染面板组件时经 v-bind 透传的节点级 props（未声明为 undefined） */
  props: Record<string, unknown> | undefined;
}

/**
 * 主面板选项卡逻辑：选项卡的打开（去重）、关闭联动、当前激活项，
 * 以及叶子节点组件路径的解析与缓存。
 *
 * 组件解析与具体 UI 组件库无关：componentMap（消费方经 import.meta.glob 生成）
 * 提供「路径 → 异步加载器」，内部用 defineAsyncComponent 包装并按路径缓存——
 * 同一路径只加载一次，选项卡反复关闭再打开不会重复发起加载；未提供 componentMap
 * 时回退为运行时动态 import（跳过打包器静态分析）。
 *
 * @param props 组件 props（只需 componentMap）
 */
export function useMainPanelTabs(props: Pick<MainPanelProps, "componentMap">) {
  const openTabs = ref<MainPanelTab[]>([]);
  const activeKey = ref("");

  /** 打开叶子对应的选项卡：已打开则仅激活（不重复创建） */
  function openTab(node: FunctionNode): void {
    const label = (node.icon ? `${node.icon} ` : "") + node.label;
    if (!openTabs.value.some((tab) => tab.key === node.key)) {
      openTabs.value.push({
        key: node.key,
        label,
        componentPath: node.component ?? "",
        props: node.props,
      });
      // 预热组件缓存，让首次渲染即命中 getComponent
      if (node.component) getComponent(node.component);
    }
    activeKey.value = node.key;
  }

  /** 关闭选项卡：关闭的是当前 tab 时激活相邻的 tab（优先右侧，否则左侧） */
  function removeTab(key: string | number): void {
    const target = String(key);
    const index = openTabs.value.findIndex((tab) => tab.key === target);
    if (index < 0) return;
    openTabs.value.splice(index, 1);
    if (activeKey.value === target) {
      const next = openTabs.value[Math.min(index, openTabs.value.length - 1)];
      activeKey.value = next?.key ?? "";
    }
  }

  /** 组件解析缓存：路径 → 已包装的异步组件 */
  const componentCache = new Map<string, Component>();

  function getComponent(path: string): Component | null {
    if (!path) return null;
    if (!componentCache.has(path)) {
      const loader = props.componentMap?.[path];
      componentCache.set(
        path,
        loader
          ? defineAsyncComponent(() => loader().then((m) => (m as { default: Component }).default))
          : // 未提供 componentMap 时的兜底：跳过打包器静态分析，按运行时动态 import 解析
            defineAsyncComponent(() => import(/* @vite-ignore */ path).then((m) => m.default)),
      );
    }
    return componentCache.get(path) ?? null;
  }

  return {
    openTabs,
    activeKey,
    openTab,
    removeTab,
    getComponent,
  };
}
