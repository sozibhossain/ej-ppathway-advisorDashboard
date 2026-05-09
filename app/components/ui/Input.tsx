"use client";

import {
  InputHTMLAttributes,
  forwardRef,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", leftIcon, rightIcon, ...rest },
  ref
) {
  return (
    <label className="block">
      {label ? (
        <span className="block mb-1.5 text-sm font-medium text-slate-700">
          {label}
        </span>
      ) : null}
      <div className="relative">
        {leftIcon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          className={`w-full h-11 ${leftIcon ? "pl-10" : "pl-4"} ${rightIcon ? "pr-10" : "pr-4"} rounded-lg bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-[#0a7a90] focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 transition-colors ${className}`}
          {...rest}
        />
        {rightIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </span>
        ) : null}
      </div>
      {error ? (
        <span className="block mt-1 text-xs text-red-600">{error}</span>
      ) : null}
    </label>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, className = "", ...rest }, ref) {
    return (
      <label className="block">
        {label ? (
          <span className="block mb-1.5 text-sm font-medium text-slate-700">
            {label}
          </span>
        ) : null}
        <textarea
          ref={ref}
          className={`w-full min-h-[100px] px-4 py-3 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-[#0a7a90] focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 transition-colors ${className}`}
          {...rest}
        />
        {error ? (
          <span className="block mt-1 text-xs text-red-600">{error}</span>
        ) : null}
      </label>
    );
  }
);

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, className = "", children, ...rest }, ref) {
    return (
      <label className="block">
        {label ? (
          <span className="block mb-1.5 text-sm font-medium text-slate-700">
            {label}
          </span>
        ) : null}
        <select
          ref={ref}
          className={`w-full h-11 px-3 rounded-lg bg-white text-slate-900 border border-slate-200 focus:border-[#0a7a90] focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 transition-colors ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error ? (
          <span className="block mt-1 text-xs text-red-600">{error}</span>
        ) : null}
      </label>
    );
  }
);

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Toggle({ checked, onChange, disabled, className = "" }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      } ${className}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
