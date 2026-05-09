"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "danger"
  | "outline"
  | "ghost"
  | "success";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#0a7a90] text-white hover:bg-[#076377] focus-visible:ring-2 focus-visible:ring-[#0a7a90]",
  secondary: "bg-[#e6f2f6] text-[#0a7a90] hover:bg-[#d0e6ec]",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline:
    "bg-white text-[#0a7a90] border border-[#0a7a90] hover:bg-[#e6f2f6]",
  ghost: "bg-transparent text-[#0a7a90] hover:bg-[#e6f2f6]",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};
const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    className = "",
    children,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            opacity="0.25"
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            opacity="0.75"
          />
        </svg>
      ) : null}
      {children}
    </button>
  );
});
