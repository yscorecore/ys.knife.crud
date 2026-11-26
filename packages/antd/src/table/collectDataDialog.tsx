import { Button, Modal, Progress } from "antd";
import type { ExportOption, ExportScope } from "@ys-knife-crud/core";
import "./collectDataDialog.css";

/**
 * YsCollectDataDialog（React + antd）：收集数据的两个对话框，与 Vue 版
 * collectDataDialog.vue 一一对应：
 * 1. 范围选择（open）——多个可用选项时由父级打开
 * 2. 「收集所有」进度（collecting）——循环拉取期间显示，可中途取消（取消后不回调）
 *
 * 受控展示组件：所有可见性与进度状态由父级（YsTable）里的 useCollectData 拥有，
 * 本组件只渲染并转发回调。
 */
export interface YsCollectDataDialogProps {
  open: boolean;
  /** 对话框标题；该能力是通用「取数」通道，可按业务语义自定义，如「打印出库」 */
  title?: string;
  options: ExportOption[];
  collecting: boolean;
  fetched: number;
  total: number;
  totalKnown: boolean;
  percent: number;
  etaSeconds: number | null;
  /** 单次收集条数上限（用于对话框里的说明文案） */
  maxCount: number;
  onCollect(scope: ExportScope): void;
  onCancelCollect(): void;
  onClose(): void;
}

/** 剩余时间文案：不足 1 分钟显示「N 秒」，否则「M 分 S 秒」；总数未知时不显示 */
function collectEtaText(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes} 分 ${rest} 秒` : `${minutes} 分`;
}

export function YsCollectDataDialog({
  open,
  title,
  options,
  collecting,
  fetched,
  total,
  totalKnown,
  percent,
  etaSeconds,
  maxCount,
  onCollect,
  onCancelCollect,
  onClose,
}: YsCollectDataDialogProps) {
  const etaText = collectEtaText(etaSeconds);

  return (
    <>
      {/* 范围选择对话框 */}
      <Modal
        open={open}
        title={title ?? "收集数据"}
        width={420}
        destroyOnClose
        onCancel={onClose}
        footer={null}
      >
        <div className="yk-collect-options">
          {options.map((option) => (
            <Button
              key={option.value}
              block
              className="yk-collect-option"
              data-scope={option.value}
              disabled={option.disabled}
              onClick={() => onCollect(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="yk-collect-limit-hint">
          单次最多 {maxCount} 条，超出将被截断。
        </p>
      </Modal>

      {/* 「收集所有」进度对话框 */}
      <Modal
        open={collecting}
        title="正在处理数据"
        width={420}
        closable={false}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        footer={<Button onClick={onCancelCollect}>取消</Button>}
      >
        <Progress percent={percent} />
        <p className="yk-collect-progress-text">
          已处理 {fetched}
          {totalKnown ? ` / ${total}` : ""} 条
          {etaText ? `，预计剩余约 ${etaText}` : ""}
        </p>
      </Modal>
    </>
  );
}

export default YsCollectDataDialog;
