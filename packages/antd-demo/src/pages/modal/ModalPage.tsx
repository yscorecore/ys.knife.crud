import { forwardRef, useImperativeHandle, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Button, Input, message } from "antd";
import { openDialog, openModal } from "@ys-knife-crud/antd";
import type { ModalAction } from "@ys-knife-crud/antd";

interface PageProps {
  onBack: () => void;
}

interface UserFormProps {
  initialName?: string;
  initialEmail?: string;
  /** 由 openModal 自动注入；调用即可关闭弹窗 */
  onClose?: () => void;
}

interface UserFormHandle {
  validate: () => Promise<boolean>;
  getData: () => { name: string; email: string };
}

/** 弹窗内容组件：通过 forwardRef 暴露 validate/getData，供底部动作取用 */
const UserForm = forwardRef<UserFormHandle, UserFormProps>(function UserForm(props, ref) {
  const [name, setName] = useState(props.initialName ?? "");
  const [email, setEmail] = useState(props.initialEmail ?? "");
  const [error, setError] = useState("");

  useImperativeHandle(
    ref,
    () => ({
      validate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!name.trim()) {
          setError("姓名不能为空");
          return false;
        }
        if (!email.includes("@")) {
          setError("邮箱格式不正确");
          return false;
        }
        setError("");
        return true;
      },
      getData: () => ({ name: name.trim(), email: email.trim() }),
    }),
    [name, email],
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        姓名
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
        邮箱
        <Input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      {error ? (
        <span style={{ color: "#cf1322", fontSize: 12 }}>{error}</span>
      ) : null}
      <Button
        type="link"
        size="small"
        style={{ paddingLeft: 0 }}
        onClick={() => props.onClose?.()}
      >
        关闭（内容组件调用 props.onClose）
      </Button>
    </div>
  );
});

/** openModal 的 component 参数类型是 ComponentType<Record<string, unknown>> */
const userFormComponent = UserForm as unknown as ComponentType<Record<string, unknown>>;

/** actions 演示：取消直接关闭；保存先校验，失败时不 close，弹窗保持打开 */
function buildActions(): ModalAction[] {
  return [
    { name: "cancel", desc: "取消", execute: (handle) => handle.close() },
    {
      name: "save",
      desc: "保存",
      type: "primary",
      execute: async (handle) => {
        const form = handle.getContentInstance() as UserFormHandle | null;
        if (!form) return;
        const ok = await form.validate();
        if (!ok) return;
        await new Promise((resolve) => setTimeout(resolve, 600));
        message.success(`已保存：${form.getData().name}`);
        handle.close();
      },
    },
  ];
}

function openWithActions(): void {
  openModal({
    title: "编辑用户（actions：取消 / 保存）",
    width: 520,
    component: userFormComponent,
    props: { initialName: "Alice", initialEmail: "alice@example.com" },
    actions: buildActions(),
    onCancel: () => message.info("已取消"),
  });
}

function openWithDialog(): void {
  openDialog({
    title: "编辑用户（openDialog：取消 / 确定）",
    width: 520,
    component: userFormComponent,
    props: { initialName: "Bob", initialEmail: "bob@example.com" },
    onConfirm: async (handle) => {
      const form = handle.getContentInstance() as UserFormHandle | null;
      if (!form) return false;
      const ok = await form.validate();
      // 返回 false → 弹窗不关闭；返回 undefined → 关闭
      if (!ok) return false;
      await new Promise((resolve) => setTimeout(resolve, 600));
      message.success(`已保存：${form.getData().name}`);
      return undefined;
    },
  });
}

function PageShell(props: {
  title: string;
  hint: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 24 }}>
      <Button type="link" style={{ paddingLeft: 0 }} onClick={props.onBack}>
        ← 返回导航
      </Button>
      <h1 style={{ margin: "12px 0 8px", fontSize: 22 }}>{props.title}</h1>
      <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        {props.hint}
      </p>
      {props.children}
    </main>
  );
}

/**
 * 代码式弹窗演示：openModal 的 actions 由数据驱动，execute 中经
 * handle.getContentInstance() 拿到内容组件实例；openDialog 固定「取消/确定」，
 * onConfirm 返回 false 时阻止关闭。
 */
export function ModalPage({ onBack }: PageProps) {
  return (
    <PageShell
      title="代码式弹窗（openModal / openDialog）"
      hint="无需在 JSX 中声明 Modal：在事件处理器里直接打开内容组件。内容组件通过 forwardRef 暴露 validate/getData；底部动作经 handle.getContentInstance() 调用，校验失败时不关闭；openDialog 的 onConfirm 返回 false 同样保持打开。"
      onBack={onBack}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Button type="primary" onClick={openWithActions}>
          ① openModal + actions（异步校验）
        </Button>
        <Button type="primary" ghost onClick={openWithDialog}>
          ② openDialog + onConfirm（返回 false 阻止关闭）
        </Button>
      </div>
    </PageShell>
  );
}

export default ModalPage;
