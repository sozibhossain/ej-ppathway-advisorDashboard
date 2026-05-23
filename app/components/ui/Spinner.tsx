"use client";

export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin text-[#0a7a90] ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
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
        opacity="0.85"
      />
    </svg>
  );
}

import { FullPageSkeleton } from "./Skeleton";

export function PageSpinner() {
  return <FullPageSkeleton />;
}
