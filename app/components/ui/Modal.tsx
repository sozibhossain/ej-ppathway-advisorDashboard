"use client";

import { useEffect, ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  hideClose?: boolean;
};

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  hideClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[92vh] overflow-y-auto`}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between p-6 pb-2">
            {title ? (
              <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            ) : (
              <span />
            )}
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-slate-500 hover:text-slate-900 transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6L18 18M6 18L18 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Not now",
  danger = false,
  loading = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} hideClose size="sm">
      <div className="text-center py-2">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        {description && (
          <p className="text-slate-600 text-sm mb-4">{description}</p>
        )}
        {children}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-11 rounded-lg font-medium text-white disabled:opacity-50 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#0a7a90] hover:bg-[#076377]"
            }`}
          >
            {loading ? "..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
