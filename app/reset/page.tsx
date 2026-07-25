"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { useToast } from "../lib/toast";
import { Button } from "../components/ui/Button";
import { AuthShell } from "../components/AuthShell";
import { LockIcon, EyeIcon, EyeOffIcon } from "../components/Icons";

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const resetToken = params?.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => router.push("/login"), 2500);
    return () => clearTimeout(t);
  }, [success, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      toast.error("Reset token missing — request a new code");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        "/auth/reset-password",
        { resetToken, newPassword, confirmPassword },
        { skipAuth: true }
      );
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Reset failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AuthShell
        bgImage="/reset-password.png"
        title="Reset your Password"
        subtitle="Please enter a new password for your account. Use a strong password to keep your account secure."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <LockIcon
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Enter New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full h-13 pl-12 pr-12 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-transparent shadow-sm focus:border-[#0a7a90] focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label="toggle password"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showPwd ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>

          <div className="relative">
            <LockIcon
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full h-13 pl-12 pr-12 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-transparent shadow-sm focus:border-[#0a7a90] focus:outline-none focus:ring-2 focus:ring-[#0a7a90]/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label="toggle confirm password"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showConfirm ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>

          <Button
            type="submit"
            loading={submitting}
            className="w-full mt-2"
            size="lg"
          >
            Continue
          </Button>
        </form>
      </AuthShell>

      {success ? <ResetSuccessModal /> : null}
    </>
  );
}

function ResetSuccessModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[22.5rem] rounded-2xl bg-white p-6 text-center shadow-xl sm:p-8 flex flex-col items-center">
        <div className="relative mb-5">
          <div className="absolute -top-1 -left-2 w-3 h-3 rounded-full bg-[#0a7a90]/80" />
          <div className="absolute top-2 -right-3 w-2 h-2 rounded-full bg-[#0a7a90]/60" />
          <div className="absolute -bottom-2 left-1 w-2 h-2 rounded-full bg-[#0a7a90]/40" />
          <div className="absolute bottom-1 -right-2 w-3 h-3 rounded-full bg-[#0a7a90]/70" />
          <div className="w-20 h-20 rounded-full bg-[#0a7a90] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#0a7a90] mb-2">Successful!</h2>
        <p className="text-sm text-slate-600 mb-5">
          Your Password is successfully changed. Your will be redirected to the
          Log in page with in a few seconds..
        </p>
        <svg
          className="w-7 h-7 animate-spin text-[#0a7a90]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
          />
        </svg>
      </div>
    </div>
  );
}
