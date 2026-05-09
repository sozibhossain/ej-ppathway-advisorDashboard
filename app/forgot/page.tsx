"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { useToast } from "../lib/toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { AuthShell } from "../components/AuthShell";
import { MailIcon } from "../components/Icons";

export default function ForgotPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email is required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email }, { skipAuth: true });
      toast.success("If the email exists, an OTP has been sent.");
      router.push(`/verify?email=${encodeURIComponent(email)}&purpose=reset`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Request failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your email and we'll send a reset code"
      bottomLink={{
        href: "/login",
        text: "Remembered your password?",
        label: "Back to sign in",
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
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Send Code
        </Button>
      </form>
    </AuthShell>
  );
}
