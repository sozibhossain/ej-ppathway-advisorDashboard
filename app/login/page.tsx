"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ApiError } from "../lib/api";
import { AuthShell } from "../components/AuthShell";
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon } from "../components/Icons";

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Advisor Login"
      subtitle="Sign in to manage your sessions and earnings"
      bottomLink={{
        href: "/signup",
        text: "Don't have an advisor account?",
        label: "Sign up",
      }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="advisor@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<MailIcon size={18} />}
          required
        />
        <Input
          label="Password"
          type={showPwd ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<LockIcon size={18} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label="toggle password"
              className="text-slate-500 hover:text-slate-800"
            >
              {showPwd ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          }
          required
        />
        <div className="flex items-center justify-end">
          <Link
            href="/forgot"
            className="text-sm text-[#0a7a90] hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Sign In
        </Button>
      </form>
    </AuthShell>
  );
}
