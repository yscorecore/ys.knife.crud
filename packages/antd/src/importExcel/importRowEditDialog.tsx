import { Alert, Button, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";
import type { DataColumn, ImportRow } from "@ys-knife-crud/core";
import { formatCell } from "./formatCell";
import "./importRowEditDialog.css";

/**
 * YsImportRowEditDialog —— 导入失败行的编辑弹窗（antd 版）。
 *
 * 仅负责表单展示与提交：每次打开时按 columns 从 row.data 回填字符串表单；
 * 保存时把原始输入交给 saver（由父组件注入，内部走 valueMapper + validator）。
 * saver 返回 errors：
 * - 有错误：弹窗不关闭，顶部红色提示全部错误；
 * - 无错误：回调 onSaved（父组件同步勾选/提示）并关闭弹窗。
 */
export interface ImportRowEditDialogProps {
  /** 是否打开（受控） */
  open: boolean;
  /** 当前编辑的行 */
  row: ImportRow | null;
  /** 列定义：按 DataColumn 渲染表单项 */
  columns: DataColumn[];
  /** 保存回调：返回更新后的行与本次校验错误 */
  saver: (row: ImportRow, inputs: Record<string, unknown>) => { row: ImportRow; errors: string[] };
  /** 请求关闭（取消 / 保存成功后） */
  onClose?: () => void;
  /** 保存校验通过 */
  onSaved?: (row: ImportRow) => void;
}

export function ImportRowEditDialog({
  open,
  row,
  columns,
  saver,
  onClose,
  onSaved,
}: ImportRowEditDialogProps) {
  /** 编辑表单（输入统一为字符串，保存时由 saver 走各列 valueMapper 转换） */
  const [form, setForm] = useState<Record<string, string>>({});
  /** 本次保存的校验错误（仍有错误时弹窗不关闭，就地提示） */
  const [errors, setErrors] = useState<string[]>([]);

  // 每次打开：按当前行回填表单并清空上一次的错误
  useEffect(() => {
    if (!open || !row) return;
    const next: Record<string, string> = {};
    for (const col of columns) {
      next[col.name] = formatCell(row.data[col.name]);
    }
    setForm(next);
    setErrors([]);
  }, [open, row, columns]);

  function close(): void {
    onClose?.();
  }

  function onSave(): void {
    if (!row) return;
    const inputs: Record<string, unknown> = {};
    for (const col of columns) {
      inputs[col.name] = form[col.name] ?? "";
    }
    const { row: updated, errors: nextErrors } = saver(row, inputs);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    onSaved?.(updated);
    close();
  }

  return (
    <Modal
      open={open}
      title={row ? `编辑第 ${row.rowNumber} 行` : "编辑数据行"}
      width={480}
      maskClosable={false}
      destroyOnClose
      onCancel={close}
      footer={
        <>
          <Button onClick={close}>取消</Button>
          <Button type="primary" onClick={onSave}>
            保存并重新校验
          </Button>
        </>
      }
    >
      {errors.length > 0 ? (
        <Alert
          className="yk-import-row-edit-dialog__alert"
          type="error"
          showIcon
          message={
            <>
              {errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </>
          }
        />
      ) : null}
      <Form labelCol={{ flex: "0 0 92px" }} wrapperCol={{ flex: "auto" }}>
        {columns.map((col) => (
          <Form.Item key={col.name} label={col.name} required={!col.optional}>
            <Input
              value={form[col.name] ?? ""}
              placeholder={col.optional ? "可留空" : `请输入${col.name}`}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [col.name]: e.target.value }))
              }
              onPressEnter={onSave}
            />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
