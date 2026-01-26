import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  message: string;
  type?: ToastType;
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss?: (id: number) => void;
  maxWidth?: number;
  className?: string;
  style?: React.CSSProperties;
};

const typeStyles: Record<ToastType, { background: string; border: string; color: string }> = {
  success: { background: "#ecfdf3", border: "#16a34a", color: "#0f172a" },
  error: { background: "#fee2e2", border: "#ef4444", color: "#0f172a" },
  warning: { background: "#ffedd5", border: "#f97316", color: "#0f172a" },
  info: { background: "#dbeafe", border: "#3b82f6", color: "#0f172a" },
};

export function ToastStack({
  toasts,
  onDismiss,
  maxWidth = 320,
  className,
  style,
}: ToastStackProps) {
  if (!toasts.length) return null;

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        display: "grid",
        gap: 8,
        zIndex: 9999,
        maxWidth,
        ...style,
      }}
    >
      {toasts.map((toast) => {
        const type = toast.type ?? "info";
        const styles = typeStyles[type];
        return (
          <div
            key={toast.id}
            className="card-base"
            role={onDismiss ? "button" : undefined}
            tabIndex={onDismiss ? 0 : undefined}
            onClick={onDismiss ? () => onDismiss(toast.id) : undefined}
            onKeyDown={
              onDismiss
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onDismiss(toast.id);
                    }
                  }
                : undefined
            }
            style={{
              padding: "10px 12px",
              background: styles.background,
              border: `1px solid ${styles.border}`,
              color: styles.color,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              cursor: onDismiss ? "pointer" : "default",
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}

type ToastQueueOptions = {
  durationMs?: number;
};

export function useToastQueue(options: ToastQueueOptions = {}) {
  const { durationMs = 4000 } = options;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", durationOverride?: number) => {
      counterRef.current += 1;
      const id = counterRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);

      const timeout = durationOverride ?? durationMs;
      if (timeout > 0) {
        const timeoutId = setTimeout(() => dismissToast(id), timeout);
        timeoutsRef.current.set(id, timeoutId);
      }

      return id;
    },
    [dismissToast, durationMs]
  );

  const clearToasts = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  const api = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      clearToasts,
    }),
    [toasts, showToast, dismissToast, clearToasts]
  );

  return api;
}
