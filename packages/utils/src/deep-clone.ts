/**
 * 深拷贝（基于结构化克隆算法，支持绝大多数可序列化数据结构）
 *
 * 注意：不支持函数、Symbol、DOM 节点、prototype 链等不可克隆的值。
 */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}
