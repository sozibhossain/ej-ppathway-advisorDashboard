"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { useToast } from "../lib/toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
  const [submitting, setSubmitting] = useState(false);

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
      toast.success("Password reset — please sign in");
      router.push("/login");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Reset failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Set a new password for your account"
      bottomLink={{
        href: "/login",
        text: "Need help?",
        label: "Back to sign in",
      }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="New Password"
          type={showPwd ? "text" : "password"}
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          leftIcon={<LockIcon size={18} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="text-slate-500 hover:text-slate-800"
              aria-label="toggle password"
            >
              {showPwd ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          }
          required
        />
        <Input
          label="Confirm Password"
          type={showPwd ? "text" : "password"}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirm(e.target.value)}
          leftIcon={<LockIcon size={18} />}
          required
        />
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Reset Password
        </Button>
      </form>
    </AuthShell>
  );
}
