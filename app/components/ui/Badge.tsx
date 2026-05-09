"use client";

import { ReactNode } from "react";

type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  primary: "bg-[#e6f2f6] text-[#0a7a90]",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
  purple: "bg-violet-100 text-violet-700",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
