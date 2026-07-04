"use client";

import * as React from "react";
import { Modal } from "./modal";
import { Button } from "./button";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" renders a red confirm button for destructive actions. */
  tone?: "danger" | "default";
}

interface PendingState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Promise-based confirmation dialog — a branded replacement for `window.confirm`.
 *
 * Usage:
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   if (!(await confirm({ description: "...", tone: "danger" }))) return;
 *   ...
 *   return (<>{confirmDialog}{/* rest of component *\/}</>);
 */
export function useConfirm() {
  const [pending, setPending] = React.useState<PendingState | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const settle = React.useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const confirmDialog = pending ? (
    <Modal
      open
      onClose={() => settle(false)}
      title={pending.title ?? "تأكيد الإجراء"}
      footer={
        <>
          <Button variant="outline" onClick={() => settle(false)}>
            {pending.cancelLabel ?? "إلغاء"}
          </Button>
          <Button
            variant={pending.tone === "danger" ? "destructive" : "default"}
            onClick={() => settle(true)}
          >
            {pending.confirmLabel ?? "تأكيد"}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        {pending.description}
      </p>
    </Modal>
  ) : null;

  return { confirm, confirmDialog };
}
