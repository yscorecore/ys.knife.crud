import { Tag } from "antd";

/** 分类管理面板：标签展示 */
const categories = [
  { name: "前端开发", count: 24 },
  { name: "后端服务", count: 18 },
  { name: "数据库", count: 9 },
  { name: "运维部署", count: 7 },
  { name: "算法", count: 12 },
  { name: "产品设计", count: 5 },
];

export function ArticleCategoryPanel() {
  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 6 }}>
      {categories.map((cat) => (
        <Tag key={cat.name} style={{ margin: "0 8px 8px 0" }}>
          {cat.name}（{cat.count}）
        </Tag>
      ))}
    </div>
  );
}

export default ArticleCategoryPanel;
