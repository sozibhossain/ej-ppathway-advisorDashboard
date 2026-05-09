"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  api,
  clearAuth,
  getStoredUser,
  setAuth,
  ApiError,
} from "./api";
import type { AdvisorUser } from "./types";

type AuthContextValue = {
  user: AdvisorUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdvisorUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  setUser: (u: AdvisorUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_PREFIXES = ["/login", "/signup", "/verify", "/forgot", "/reset"];

const isPublicPath = (path?: string | null) => {
  if (!path) return false;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<AdvisorUser | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: AdvisorUser | null) => {
    setUserState(u);
    if (u) {
      const access = localStorage.getItem("ej_advisor_access_token") || "";
      const refresh = localStorage.getItem("ej_advisor_refresh_token") || "";
      setAuth(access, refresh, u);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const r = await api.get<AdvisorUser>("/auth/me");
      if (r.data) {
        setUserState(r.data);
        const access = localStorage.getItem("ej_advisor_access_token") || "";
        const refresh = localStorage.getItem("ej_advisor_refresh_token") || "";
        if (access) setAuth(access, refresh, r.data);
      }
    } catch {
      setUserState(null);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser<AdvisorUser>();
    if (stored) setUserState(stored);
    setLoading(false);
    if (stored) refreshMe();
  }, [refreshMe]);

  // Route guard
  useEffect(() => {
    if (loading) return;
    const onPublic = isPublicPath(pathname);
    if (!user && !onPublic) {
      router.replace("/login");
    } else if (user && onPublic) {
      router.replace("/");
    }
  }, [loading, user, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AdvisorUser;
      }>("/auth/login", { email, password }, { skipAuth: true });
      const data = r.data;
      if (!data) throw new ApiError("Login failed", 500, null);
      if (data.user.role !== "advisor") {
        throw new ApiError("This account is not an advisor account", 403, null);
      }
      setAuth(data.accessToken, data.refreshToken, data.user);
      setUserState(data.user);
      router.replace("/");
      return data.user;
    },
    [router]
  );

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refreshMe, setUser }),
    [user, loading, login, logout, refreshMe, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
