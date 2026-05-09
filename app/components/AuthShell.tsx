"use client";

import { ReactNode } from "react";
import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  bottomLink,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  bottomLink?: { href: string; text: string; label: string };
}) {
  return (
    <div className="min-h-screen flex items-stretch">
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="text-2xl font-semibold text-slate-900">Prophetic</div>
            <div className="text-[#0a7a90] tracking-[0.25em] text-xs">
              PATHWAY
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              HEARING GOD. FINDING PURPOSE. FULFILLING DESTINY
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
          ) : (
            <div className="mb-4" />
          )}

          {children}

          {bottomLink ? (
            <p className="text-sm text-slate-500 mt-6 text-center">
              {bottomLink.text}{" "}
              <Link
                href={bottomLink.href}
                className="text-[#0a7a90] font-semibold hover:underline"
              >
                {bottomLink.label}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#0a7a90] to-[#063e4d] items-center justify-center p-12">
        <div className="text-white max-w-lg">
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Hearing God. Finding Purpose. Fulfilling Destiny.
          </h2>
          <p className="text-white/80 text-lg">
            Welcome to Prophetic Pathway — your advisor command center for
            sessions, bookings, and growth.
          </p>
        </div>
      </div>
    </div>
  );
}
