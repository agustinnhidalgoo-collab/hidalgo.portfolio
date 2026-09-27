"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* ─── Confirmación ──────────────────────────────────────────── */

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;

/* ─── Avisos ────────────────────────────────────────────────── */

interface Toast {
  id: number;
  text: string;
  error?: boolean;
}
type ToastFn = (text: string, opts?: { error?: boolean }) => void;

const UiContext = createContext<{ confirm: ConfirmFn; toast: ToastFn } | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (opts) dialogRef.current?.showModal();
  }, [opts]);

  const close = (value: boolean) => {
    dialogRef.current?.close();
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  const toast = useCallback<ToastFn>((text, o) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, error: o?.error }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), o?.error ? 6000 : 3000);
  }, []);

  return (
    <UiContext.Provider value={{ confirm, toast }}>
      {children}
      <dialog ref={dialogRef} className="a-dialog" onCancel={(e) => (e.preventDefault(), close(false))} aria-labelledby="confirm-title">
        {opts && (
          <>
            <div className="a-dialog__body">
              <h2 id="confirm-title" className="a-display" style={{ fontSize: "1.6rem" }}>
                {opts.title}
              </h2>
              {opts.message && <div>{opts.message}</div>}
            </div>
            <div className="a-dialog__foot">
              <button type="button" className="a-btn a-btn--ghost" onClick={() => close(false)} autoFocus>
                {opts.cancelLabel ?? "Cancelar"}
              </button>
              <button type="button" className={`a-btn a-btn--solid ${opts.danger ? "a-btn--danger" : ""}`} onClick={() => close(true)}>
                {opts.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </>
        )}
      </dialog>
      <div className="a-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`a-toast ${t.error ? "a-toast--error" : ""}`}>
            {t.text}
          </div>
        ))}
      </div>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi fuera de UiProvider");
  return ctx;
}
