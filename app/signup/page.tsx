"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { useToast } from "../lib/toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { AuthShell } from "../components/AuthShell";
import {
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  PhoneIcon,
} from "../components/Icons";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Name, email and password are required");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        "/auth/advisor/signup",
        { name, email, phoneNumber, password, confirmPassword },
        { skipAuth: true }
      );
      toast.success("Verification code sent to your email");
      router.push(`/verify?email=${encodeURIComponent(email)}&purpose=verify`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Signup failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Become an Advisor"
      subtitle="Create your account and start guiding clients"
      bottomLink={{
        href: "/login",
        text: "Already have an account?",
        label: "Sign in",
      }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full Name"
          autoComplete="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserIcon size={18} />}
          required
        />
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
          label="Phone Number"
          type="tel"
          placeholder="+1 (44) 7928 000000"
          value={phoneNumber}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<PhoneIcon size={18} />}
        />
        <Input
          label="Password"
          type={showPwd ? "text" : "password"}
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
          Create Account
        </Button>
      </form>
    </AuthShell>
  );
}
