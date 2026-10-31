import { createElement, isValidElement } from "react";
import type { ComponentType, ReactNode } from "react";

/**
 * 渲染「图标」：兼容 ReactNode / React 组件 / 字符串（emoji 等）。
 * Vue 版用 <component :is> 接受组件或 VNode；React 版对应此工具。
 */
export function renderIcon(icon: unknown): ReactNode {
  if (icon == null || icon === false) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === "string" || typeof icon === "number") return icon;
  if (typeof icon === "function") {
    return createElement(icon as ComponentType<unknown>);
  }
  return null;
}
