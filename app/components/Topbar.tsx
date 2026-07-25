"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import {
  DashboardIcon,
  BookingsIcon,
  WalletIcon,
  SettingsIcon,
  BellIcon,
  ChevronDownIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  UserIcon,
  SessionsIcon,
  StarIcon,
  ChatIcon,
  AwardIcon,
} from "./Icons";
import { Avatar } from "./ui/Avatar";

const NAV = [
  { href: "/", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/profile", label: "My Profile", icon: UserIcon, exact: true },
  { href: "/profile?tab=pricing", label: "Pricing", icon: WalletIcon },
  { href: "/sessions", label: "Sessions", icon: SessionsIcon },
  { href: "/availability", label: "Availability", icon: BookingsIcon },
  { href: "/wallet?tab=earnings", label: "Earnings", icon: WalletIcon },
  { href: "/profile?tab=reviews", label: "Reviews", icon: StarIcon },
  { href: "/profile?tab=promotion", label: "Promotion Tools", icon: AwardIcon },
  { href: "/wallet?tab=withdrawals", label: "Payouts", icon: AwardIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon, badge: "unread" },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/support", label: "Support", icon: ChatIcon },
];

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState<number>(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const notifsRes = await api.get<{ items: { read: boolean }[] }>(
          "/notifications",
          { limit: 50 },
        );
        if (cancel) return;
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

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountMenuOpen(false);
  }, [pathname, searchParams]);

  const isActive = (href: string, exact?: boolean) => {
    if (!pathname) return false;
    const [path, query] = href.split("?");
    if (query) {
      const expected = new URLSearchParams(query);
      if (pathname !== path) return false;
      for (const [key, value] of expected.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    if (exact) return pathname === path && !searchParams.toString();
    return pathname === path || pathname.startsWith(path + "/");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV.map((n) => {
        const Icon = n.icon;
        const active = isActive(n.href, n.exact);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${
              active
                ? "bg-[#e6f2f6] text-[#0a7a90]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={17} className={active ? "text-[#0a7a90]" : "text-slate-400"} />
            <span className="flex-1 truncate">{n.label}</span>
            {n.badge === "unread" && unread > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0a7a90] px-1.5 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-slate-200 bg-white md:flex md:flex-col">
        <Link href="/" className="flex items-center shrink-0" aria-label="Prophetic Pathway">
          <Image
            src="/logo.png"
            alt="Prophetic Pathway"
            width={160}
            height={48}
            priority
            className="mx-6 my-5 h-10 w-auto object-contain"
          />
        </Link>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto thin-scroll">
          <NavLinks />
        </nav>

        <div className="m-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <SettingsIcon size={15} />
            Your Time Zone
          </div>
          <div className="mt-1 text-xs font-bold text-slate-800">
            {user?.timezone || "Eastern Time"}
          </div>
        </div>
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[700] md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center"
                aria-label="Prophetic Pathway"
              >
                <Image
                  src="/logo.png"
                  alt="Prophetic Pathway"
                  width={150}
                  height={45}
                  priority
                  className="h-10 w-auto max-w-40 object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 thin-scroll">
              <NavLinks onNavigate={() => setDrawerOpen(false)} />
            </nav>

            <div className="m-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <SettingsIcon size={15} />
                Your Time Zone
              </div>
              <div className="mt-1 text-xs font-bold text-slate-800">
                {user?.timezone || "Eastern Time"}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white md:left-64">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <MenuIcon size={22} />
          </button>

          <Link href="/" className="flex items-center shrink-0 md:hidden" aria-label="Prophetic Pathway">
            <Image
              src="/logo.png"
              alt="Prophetic Pathway"
              width={140}
              height={42}
              priority
              className="h-9 w-auto max-w-36 object-contain"
            />
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <Avatar name={user?.name} src={user?.profilePhoto} size={36} />
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-sm font-semibold text-slate-900 truncate max-w-30">
                  {user?.name || "Advisor"}
                </div>
                <div className="text-xs text-slate-500">Advisor</div>
              </div>
              <ChevronDownIcon size={16} className="text-slate-500" />
            </button>

            {accountMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setAccountMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-20 w-52 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  <Link
                    href="/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon size={16} />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setAccountMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <SettingsIcon size={16} />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
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
      </header>
    </>
  );
}
