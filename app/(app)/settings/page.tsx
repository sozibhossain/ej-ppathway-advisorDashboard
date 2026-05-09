"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../../lib/toast";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Toggle } from "../../components/ui/Input";
import { ConfirmDialog } from "../../components/ui/Modal";
import {
  UserIcon,
  LockIcon,
  BellIcon,
  WalletIcon,
  MailIcon,
  PhoneIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  DownloadIcon,
} from "../../components/Icons";

type NotifPrefs = {
  email?: boolean;
  newSessions?: boolean;
  newMessages?: boolean;
  paymentUpdates?: boolean;
  push?: boolean;
};

export default function SettingsPage() {
  const toast = useToast();
  const { user, refreshMe, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("UTC");
  const [prefs, setPrefs] = useState<NotifPrefs>({});

  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [confirmDeact, setConfirmDeact] = useState(false);
  const [deactLoading, setDeactLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setLanguage(user.language || "English");
    setTimezone(user.timezone || "UTC");
    setPrefs(user.notifPrefs || {});
    setLoading(false);
  }, [user]);

  const saveAccount = async () => {
    setSavingAccount(true);
    try {
      const fd = new FormData();
      fd.append("phone", phone);
      fd.append("language", language);
      fd.append("timezone", timezone);
      await api.patch("/users/profile", fd, { isFormData: true });
      toast.success("Account updated");
      refreshMe();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSavingAccount(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await api.patch("/users/notification-prefs", prefs);
      toast.success("Preferences updated");
      refreshMe();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSavingPrefs(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Fill all password fields");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPwdLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword: confirm,
      });
      toast.success("Password updated");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setPwdLoading(false);
    }
  };

  const deactivate = async () => {
    setDeactLoading(true);
    try {
      await api.post("/users/deactivate");
      toast.success("Account deactivated");
      logout();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setDeactLoading(false);
    }
  };

  const downloadData = async () => {
    try {
      const r = await api.get<unknown>("/users/profile");
      const blob = new Blob([JSON.stringify(r.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "advisor-account-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download data");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
        <Button onClick={saveAccount} loading={savingAccount}>
          Save All Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section
            title="Account Information"
            icon={<UserIcon size={18} />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Email Address"
                value={email}
                onChange={() => undefined}
                icon={<MailIcon size={16} />}
                readOnly
              />
              <FormInput
                label="Phone Number"
                value={phone}
                onChange={setPhone}
                icon={<PhoneIcon size={16} />}
                placeholder="+1 (44) 7928 000000"
              />
              <FormInput
                label="Language"
                value={language}
                onChange={setLanguage}
                icon={<span className="text-base">🌐</span>}
              />
              <FormInput
                label="Time Zone"
                value={timezone}
                onChange={setTimezone}
                icon={<ClockIcon size={16} />}
                placeholder="e.g. America/New_York"
              />
            </div>
          </Section>

          <Section title="Change Password" icon={<LockIcon size={18} />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Current password"
                type={showPwd ? "text" : "password"}
                value={currentPassword}
                onChange={setCurrent}
                icon={<LockIcon size={16} />}
                placeholder="••••••••"
              />
              <FormInput
                label="New password"
                type={showPwd ? "text" : "password"}
                value={newPassword}
                onChange={setNew}
                icon={<LockIcon size={16} />}
                placeholder="••••••••"
              />
              <FormInput
                label="Confirm password"
                type={showPwd ? "text" : "password"}
                value={confirm}
                onChange={setConfirm}
                icon={<LockIcon size={16} />}
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="text-xs text-slate-500 inline-flex items-center gap-1 hover:text-slate-800"
              >
                {showPwd ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                {showPwd ? "Hide passwords" : "Show passwords"}
              </button>
              <Button onClick={changePassword} loading={pwdLoading}>
                Update Password
              </Button>
            </div>
          </Section>

          <Section
            title="Notification Preferences"
            icon={<BellIcon size={18} />}
          >
            <div className="space-y-3">
              <PrefRow
                label="Email Notifications"
                checked={!!prefs.email}
                onChange={(v) => setPrefs({ ...prefs, email: v })}
              />
              <PrefRow
                label="New session requests"
                checked={!!prefs.newSessions}
                onChange={(v) => setPrefs({ ...prefs, newSessions: v })}
              />
              <PrefRow
                label="New messages"
                checked={!!prefs.newMessages}
                onChange={(v) => setPrefs({ ...prefs, newMessages: v })}
              />
              <PrefRow
                label="Payment updates"
                checked={!!prefs.paymentUpdates}
                onChange={(v) => setPrefs({ ...prefs, paymentUpdates: v })}
              />
              <PrefRow
                label="Push Notifications"
                checked={!!prefs.push}
                onChange={(v) => setPrefs({ ...prefs, push: v })}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={savePrefs} loading={savingPrefs}>
                Save Preferences
              </Button>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section
            title="Payment Method"
            icon={<WalletIcon size={18} />}
            noPad
          >
            <div className="rounded-xl bg-gradient-to-br from-[#0a7a90] to-[#063e4d] text-white p-5 m-5 mb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">Stripe Connect</div>
                  <div className="text-2xl font-bold tracking-widest mt-3">
                    **** **** **** {user?.stripeConnectId?.slice(-4) || "—"}
                  </div>
                  <div className="text-xs mt-2 opacity-80">
                    {user?.stripeConnectVerified
                      ? "Connected · verified"
                      : "Pending verification"}
                  </div>
                </div>
                <span className="text-3xl">💳</span>
              </div>
            </div>
            <div className="px-5 pb-5">
              <p className="text-xs text-slate-500">
                Connect or update your Stripe account from the wallet area.
              </p>
            </div>
          </Section>

          <Section title="Quick Actions" icon={<UserIcon size={18} />}>
            <button
              type="button"
              onClick={downloadData}
              className="w-full h-11 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
            >
              <DownloadIcon size={14} />
              Download Account Data
            </button>
            <button
              type="button"
              className="w-full h-11 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center justify-center gap-2 mt-2"
            >
              Privacy Settings
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeact(true)}
              className="w-full h-11 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium flex items-center justify-center gap-2 mt-2"
            >
              Deactivate Account
            </button>
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeact}
        onClose={() => setConfirmDeact(false)}
        onConfirm={deactivate}
        title="Deactivate Account?"
        description="This will sign you out and disable your advisor profile. You can contact support to reactivate."
        confirmText="Deactivate"
        danger
        loading={deactLoading}
      />
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  noPad,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  noPad?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-900">
        <span className="text-[#0a7a90]">{icon}</span>
        {title}
      </div>
      {noPad ? children : <div className="p-5">{children}</div>}
    </div>
  );
}

function PrefRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  icon,
  placeholder,
  readOnly,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      <div className="relative">
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full h-11 ${icon ? "pl-10" : "pl-4"} pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#0a7a90] focus:ring-2 focus:ring-[#0a7a90]/20 ${
            readOnly ? "bg-slate-50" : ""
          }`}
        />
      </div>
    </label>
  );
}
