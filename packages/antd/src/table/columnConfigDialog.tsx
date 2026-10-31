import { Button, Checkbox, Input, Modal } from "antd";
import type { DraftColumn } from "@ys-knife-crud/core";
import "./columnConfigDialog.css";

/**
 * YsColumnConfigDialog（React + antd）：列设置对话框的受控展示组件。
 *
 * 与 Vue 版 columnConfigDialog.vue 不同，本组件不持有任何状态——
 * 草稿列表（drafts）、显隐/排序/宽度的编辑、重置、保存全部由父级
 * （YsTable）里的 useCustomConfig 拥有，本组件只负责渲染并回调：
 * - 勾选显隐、输入列宽：onDraftsChange(新的草稿数组)
 * - 上移/下移：onMove(index, delta)
 * - 重置/取消/保存：onReset / onCancel / onSave
 */
export interface YsColumnConfigDialogProps {
  open: boolean;
  drafts: DraftColumn[];
  onCancel(): void;
  onSave(): void | Promise<void>;
  onReset(): void;
  onMove(index: number, delta: number): void;
  onDraftsChange(drafts: DraftColumn[]): void;
}

/** 用不可变方式替换草稿数组中第 index 项的部分字段 */
function replaceDraft(
  drafts: DraftColumn[],
  index: number,
  patch: Partial<DraftColumn>,
): DraftColumn[] {
  return drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft));
}

export function YsColumnConfigDialog({
  open,
  drafts,
  onCancel,
  onSave,
  onReset,
  onMove,
  onDraftsChange,
}: YsColumnConfigDialogProps) {
  return (
    <Modal
      open={open}
      title="列设置"
      width={480}
      destroyOnClose
      onCancel={onCancel}
      footer={
        <>
          <Button onClick={onReset}>重置</Button>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            className="yk-col-config-save"
            onClick={() => void onSave()}
          >
            保存
          </Button>
        </>
      }
    >
      <div className="yk-col-config">
        {drafts.map((draft, index) => (
          <div className="yk-col-config-row" key={draft.propertyPath}>
            <Checkbox
              className="yk-col-config-name"
              checked={draft.visible}
              onChange={(event) =>
                onDraftsChange(
                  replaceDraft(drafts, index, { visible: event.target.checked }),
                )
              }
            >
              {draft.displayName}
            </Checkbox>
            <Input
              className="yk-col-config-width"
              size="small"
              value={draft.width}
              placeholder="宽度(如 120)"
              onChange={(event) =>
                onDraftsChange(
                  replaceDraft(drafts, index, { width: event.target.value }),
                )
              }
            />
            <Button
              type="link"
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
            >
              上移
            </Button>
            <Button
              type="link"
              disabled={index === drafts.length - 1}
              onClick={() => onMove(index, 1)}
            >
              下移
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default YsColumnConfigDialog;
