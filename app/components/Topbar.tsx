"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import {
  DashboardIcon,
  SessionsIcon,
  BookingsIcon,
  WalletIcon,
  SettingsIcon,
  BellIcon,
  SearchIcon,
  ChevronDownIcon,
  LogoutIcon,
  UserIcon,
} from "./Icons";
import { Toggle } from "./ui/Input";
import { Avatar } from "./ui/Avatar";
import { useMyMoney } from "../lib/currency";

const NAV = [
  { href: "/", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/sessions", label: "Sessions", icon: SessionsIcon },
  { href: "/bookings", label: "Bookings", icon: BookingsIcon },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const money = useMyMoney();
  const [online, setOnline] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [unread, setUnread] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [profileRes, walletRes, notifsRes] = await Promise.all([
          api.get<{ profile: { isOnline?: boolean } }>("/advisor/profile"),
          api.get<{ wallet: { earningsBalance?: number } }>("/wallet/me"),
          api.get<{ items: { read: boolean }[] }>("/notifications", {
            limit: 50,
          }),
        ]);
        if (cancel) return;
        if (profileRes.data?.profile?.isOnline !== undefined) {
          setOnline(!!profileRes.data.profile.isOnline);
        }
        if (walletRes.data?.wallet?.earningsBalance !== undefined) {
          setWalletBalance(walletRes.data.wallet.earningsBalance || 0);
        }
        if (notifsRes.data?.items) {
          setUnread(notifsRes.data.items.filter((n) => !n.read).length);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const toggleOnline = async (next: boolean) => {
    setOnline(next);
    try {
      await api.patch("/advisor/profile/online", { isOnline: next });
    } catch {
      setOnline(!next);
    }
  };

  const isActive = (href: string, exact?: boolean) => {
    if (!pathname) return false;
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 sm:gap-4">
        <Link href="/" className="flex items-center shrink-0" aria-label="Prophetic Pathway">
          <Image
            src="/logo.png"
            alt="Prophetic Pathway"
            width={160}
            height={48}
            priority
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </Link>

        <nav className="flex-1 hidden md:flex items-center justify-center gap-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.href, n.exact);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#0a7a90] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto md:ml-0">
          <div
            className={`hidden sm:flex items-center gap-2 h-10 px-3 rounded-full text-xs font-semibold ${
              online
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {online ? "Online" : "Offline"}
            <Toggle checked={online} onChange={toggleOnline} className="ml-1" />
          </div>

          <button
            type="button"
            aria-label="Search"
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 text-slate-600"
          >
            <SearchIcon size={18} />
          </button>

          <button
            type="button"
            onClick={() => router.push("/notifications")}
            className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600"
            aria-label="Notifications"
          >
            <BellIcon size={20} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          <Link
            href="/wallet"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <WalletIcon size={18} className="text-[#0a7a90]" />
            <div className="leading-tight">
              <div className="text-[10px] text-slate-500">Wallet Balance</div>
              <div className="text-sm font-semibold text-[#0a7a90]">
                {money(walletBalance)}
              </div>
            </div>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <Avatar name={user?.name} src={user?.profilePhoto} size={36} />
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-sm font-semibold text-slate-900 truncate max-w-30">
                  {user?.name || "Advisor"}
                </div>
              </div>
              <ChevronDownIcon size={16} className="text-slate-500" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-20 w-52 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon size={16} />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <SettingsIcon size={16} />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <LogoutIcon size={16} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = isActive(n.href, n.exact);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium whitespace-nowrap ${
                active
                  ? "bg-[#0a7a90] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <Icon size={16} />
              {n.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
