import { Alert, Card } from "antd";

/** 首页面板：统计卡片 */
const stats = [
  { label: "用户总数", value: "1,286", tone: "#409eff" },
  { label: "今日订单", value: "56", tone: "#67c23a" },
  { label: "待处理消息", value: "3", tone: "#e6a23c" },
  { label: "本月销售额", value: "¥ 91,200", tone: "#f56c6c" },
];

export function DashboardPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Alert
        type="info"
        showIcon
        message="欢迎回来，管理员！从左侧功能树打开更多功能。"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {stats.map((stat) => (
          <Card key={stat.label} hoverable>
            <div style={{ fontSize: 26, fontWeight: 700, color: stat.tone }}>
              {stat.value}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#909399" }}>
              {stat.label}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default DashboardPanel;
