import { useState } from "react";
import { Alert, Button, Input, Switch } from "antd";

const rowStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: 16,
} as const;

const labelStyle = {
  width: 140,
  flexShrink: 0,
} as const;

/**
 * 参数设置面板：演示表单（title/showTip 由功能树节点的 props 透传）
 * 面板组件的 props 来自 FunctionNode.props，故声明为宽松记录类型后读取。
 */
export function SettingsPanel(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : "";
  const showTip = props.showTip !== false;

  const [autoReload, setAutoReload] = useState(true);
  const [notify, setNotify] = useState(true);
  const [pageSize, setPageSize] = useState("10");

  return (
    <div
      style={{
        maxWidth: 480,
        background: "#fff",
        padding: 20,
        borderRadius: 6,
      }}
    >
      {title ? <h3 style={{ margin: "0 0 16px" }}>{title}</h3> : null}
      {showTip ? (
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message="这里的标题与提示条来自功能树节点声明的 props。"
        />
      ) : null}
      <div>
        <div style={rowStyle}>
          <span style={labelStyle}>自动刷新数据</span>
          <Switch checked={autoReload} onChange={setAutoReload} />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>站内通知</span>
          <Switch checked={notify} onChange={setNotify} />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>默认每页条数</span>
          <Input
            style={{ width: 120 }}
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="primary">保存</Button>
          <Button>重置</Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
