import { Button, Modal, Progress } from "antd";
import type { ExportOption, ExportScope } from "@ys-knife-crud/core";
import "./exportExcelDialog.css";

/**
 * YsExportExcelDialog（React + antd）：导出 Excel 的三个对话框集合，
 * 与 Vue 版 exportExcelDialog.vue 一一对应：
 * 1. 范围选择（open）——多个可用选项时由父级打开
 * 2. 「导出所有」进度（exporting）——循环拉取期间显示，可中途取消
 * 3. 取消后的询问（cancelledVisible）——保留部分文件或整体丢弃
 *
 * 受控展示组件：所有可见性与进度状态由父级（YsTable / YsInfiniteList）
 * 里的 useExportExcel 拥有，本组件只渲染并转发回调。
 */
export interface YsExportExcelDialogProps {
  open: boolean;
  options: ExportOption[];
  exporting: boolean;
  fetched: number;
  total: number;
  totalKnown: boolean;
  percent: number;
  etaSeconds: number | null;
  cancelledVisible: boolean;
  cancelledRows: number;
  onExport(scope: ExportScope): void;
  onCancelExport(): void;
  onKeepPartial(): void;
  onDiscardPartial(): void;
  onClose(): void;
}

/**
 * 剩余时间文案（复刻 Vue 版 exportEtaText）：
 * 不足 1 分钟显示「N 秒」，否则「M 分 S 秒」；总数未知（null）时不显示。
 */
function exportEtaText(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes} 分 ${rest} 秒` : `${minutes} 分`;
}

export function YsExportExcelDialog({
  open,
  options,
  exporting,
  fetched,
  total,
  totalKnown,
  percent,
  etaSeconds,
  cancelledVisible,
  cancelledRows,
  onExport,
  onCancelExport,
  onKeepPartial,
  onDiscardPartial,
  onClose,
}: YsExportExcelDialogProps) {
  const etaText = exportEtaText(etaSeconds);

  return (
    <>
      {/* 范围选择对话框 */}
      <Modal
        open={open}
        title="导出 Excel"
        width={420}
        destroyOnClose
        onCancel={onClose}
        footer={null}
      >
        <div className="yk-export-options">
          {options.map((option) => (
            <Button
              key={option.value}
              block
              className="yk-export-option"
              data-scope={option.value}
              disabled={option.disabled}
              onClick={() => onExport(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Modal>

      {/* 「导出所有」进度对话框：总数已知 → 精确百分比 + 「已加载 N / M 条」；
          未知（接口只给 hasNext）→ 99% 封顶、不带分母 */}
      <Modal
        open={exporting}
        title="正在导出"
        width={420}
        closable={false}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        footer={<Button onClick={onCancelExport}>取消</Button>}
      >
        <Progress percent={percent} />
        <p className="yk-export-progress-text">
          已加载 {fetched}
          {totalKnown ? ` / ${total}` : ""} 条
          {etaText ? `，预计剩余约 ${etaText}` : ""}
        </p>
      </Modal>

      {/* 「导出所有」被取消后的询问：保留已写入的部分文件，或整体丢弃 */}
      <Modal
        open={cancelledVisible}
        title="导出已取消"
        width={420}
        destroyOnClose
        onCancel={onDiscardPartial}
        footer={
          <>
            <Button className="yk-export-discard" onClick={onDiscardPartial}>
              丢弃
            </Button>
            <Button
              className="yk-export-keep"
              type="primary"
              onClick={onKeepPartial}
            >
              保留部分文件
            </Button>
          </>
        }
      >
        <p className="yk-export-cancelled-text">
          已写入 {cancelledRows} 条数据，是否保留已导出的部分文件？
        </p>
      </Modal>
    </>
  );
}

export default YsExportExcelDialog;
