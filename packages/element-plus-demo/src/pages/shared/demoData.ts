import {
  constData,
  constMetaFunc,
  type Meta,
  type PageFunc,
} from "@ys.knife.crud/core";

/** 演示表格使用的行结构 */
export interface UserRow {
  id: number;
  name: string;
  email: string;
  age: number;
  secret: string;
}

/**
 * 列元数据：描述表格长什么样（列名、显示名、顺序、是否显示等）。
 * 各演示页面共用同一份定义，保持「表头」这一维度一致，便于横向对比。
 */
export const meta: Meta = {
  displayName: "用户列表",
  description: "Table 组件演示用的元数据",
  columns: [
    {
      propertyPath: "id",
      displayName: "ID",
      description: null,
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "number",
      displayOrder: 0,
      dataSource: null,
      queryFilter: null,
    },
    {
      propertyPath: "name",
      displayName: "姓名",
      description: "用户姓名",
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "string",
      displayOrder: 1,
      dataSource: null,
      queryFilter: null,
    },
    {
      propertyPath: "email",
      displayName: "邮箱",
      description: null,
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "string",
      displayOrder: 2,
      dataSource: null,
      queryFilter: null,
    },
    {
      propertyPath: "age",
      displayName: "年龄",
      description: null,
      showForDisplay: true,
      displayFormat: null,
      isArray: false,
      dataTypeName: "number",
      displayOrder: 3,
      dataSource: null,
      queryFilter: null,
    },
    // 故意设为 showForDisplay: false，验证 Table 会按元数据隐藏该列
    {
      propertyPath: "secret",
      displayName: "隐藏列",
      description: null,
      showForDisplay: false,
      displayFormat: null,
      isArray: false,
      dataTypeName: "string",
      displayOrder: 4,
      dataSource: null,
      queryFilter: null,
    },
  ],
};

/** 用 constMetaFunc 把固定元数据包装成 MetaFunc */
export const metaFun = constMetaFunc(meta);

/**
 * 三行固定数据。actions 演示会 splice 删除行，
 * 所以用工厂函数：每次进入页面都是全新的一份，删除演示不会污染其他模式。
 */
export function createRows(): UserRow[] {
  return [
    { id: 1, name: "Alice", email: "alice@example.com", age: 28, secret: "x" },
    { id: 2, name: "Bob", email: "bob@example.com", age: 34, secret: "y" },
    { id: 3, name: "Carol", email: "carol@example.com", age: 25, secret: "z" },
  ];
}

/** 分页演示用的 25 行数据（pageSize=10 → 3 页），只读不修改，常量即可 */
export const manyRows: UserRow[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User${i + 1}`,
  email: `user${i + 1}@example.com`,
  age: 20 + (i % 30),
  secret: `s${i + 1}`,
}));

/** 导出演示用的 300 行大数据（pageSize=10 → 30 页），只读不修改 */
export const exportRows: UserRow[] = Array.from({ length: 300 }, (_, i) => ({
  id: i + 1,
  name: `ExportUser${i + 1}`,
  email: `export${i + 1}@example.com`,
  age: 20 + (i % 40),
  secret: `e${i + 1}`,
}));

/**
 * 给数据源加网络延迟（并响应 AbortSignal 中断），用于演示「导出所有」的进度与取消。
 * 切片语义直接复用 constData，避免与分页契约漂移。
 */
export function delayedData<T>(values: T[], delayMs: number): PageFunc<T> {
  const inner = constData(values);
  return (req, signal) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(inner(req)), delayMs);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
}
