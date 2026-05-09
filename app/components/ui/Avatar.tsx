"use client";

import { initials } from "../../lib/format";

type Props = {
  name?: string;
  src?: string;
  size?: number;
  className?: string;
};

export function Avatar({ name = "U", src, size = 40, className = "" }: Props) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-[#0a7a90] text-white font-semibold flex items-center justify-center ${className}`}
      style={{ width: size, height: size, fontSize: size / 2.6 }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
