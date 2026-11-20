"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Stack from "@mui/material/Stack";

export type ToastTone = "success" | "error" | "warn" | "info" | "reminder";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastInput {
  tone: ToastTone;
  title: string;
  message?: string;
  duration?: number;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((input: ToastInput) => {
    counter.current += 1;
    const id = `toast-${counter.current}-${Date.now()}`;
    const item: ToastItem = { id, ...input };
    setToasts((items) => [...items.slice(-4), item]);
    const timer = setTimeout(() => dismiss(id), input.duration ?? 6500);
    timers.current.set(id, timer);
    return id;
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  return { toasts, push, dismiss };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  const severity = (tone: ToastTone) => {
    if (tone === "error") return "error" as const;
    if (tone === "warn" || tone === "reminder") return "warning" as const;
    if (tone === "success") return "success" as const;
    return "info" as const;
  };
  return (
    <Stack
      spacing={1}
      aria-live="polite"
      aria-atomic="false"
      sx={{ position: "fixed", right: 16, bottom: 16, zIndex: 1600, width: { xs: "calc(100% - 32px)", sm: 360 } }}
    >
      {toasts.map((toast) => (
        <Alert
          key={toast.id}
          severity={severity(toast.tone)}
          variant="filled"
          onClose={() => onDismiss(toast.id)}
          sx={{ alignItems: "flex-start", boxShadow: 4 }}
        >
          <AlertTitle sx={{ mb: 0.25, fontWeight: 700 }}>{toast.title}</AlertTitle>
          {toast.message ? <span>{toast.message}</span> : null}
        </Alert>
      ))}
    </Stack>
  );
}
