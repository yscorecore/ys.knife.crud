import { Timeline } from "antd";

/** 操作日志面板：时间线 */
const logs = [
  { content: "管理员 修改了参数设置「会话超时时间」", timestamp: "2026-09-19 10:12" },
  { content: "admin 新增用户「张三」", timestamp: "2026-09-18 16:40" },
  { content: "管理员 导出了用户数据（25 行）", timestamp: "2026-09-18 14:05" },
  { content: "系统 自动清理了 30 天前的操作日志", timestamp: "2026-09-17 00:00" },
];

export function LogsPanel() {
  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 6 }}>
      <Timeline
        items={logs.map((log) => ({
          children: (
            <div>
              <div>{log.content}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#909399" }}>
                {log.timestamp}
              </div>
            </div>
          ),
        }))}
      />
    </div>
  );
}

export default LogsPanel;
