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
import type { AdvisorProfile, AdvisorUser } from "./types";

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

// "Open" paths are reachable by anyone and the auth guard never redirects to or
// away from them. The contract signing page is token-authenticated, so it must
// work both from the email link (advisor not logged in) and from the in-dashboard
// notification (advisor logged in) — neither redirect should fire.
const OPEN_PREFIXES = ["/contract"];
const PROFILE_PATH = "/profile";
const DEFAULT_PROFILE_TITLE = "I am a professional advisor";

type AdvisorProfileResponse = {
  user?: AdvisorUser;
  profile?: AdvisorProfile | null;
};

const isPublicPath = (path?: string | null) => {
  if (!path) return false;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
};

const isOpenPath = (path?: string | null) => {
  if (!path) return false;
  return OPEN_PREFIXES.some((p) => path.startsWith(p));
};

const hasText = (value?: string | null) => !!value?.trim();

const isAdvisorProfileComplete = (data?: AdvisorProfileResponse | null) => {
  const u = data?.user;
  const p = data?.profile;
  if (!u || !p) return false;

  const title = p.professionalTitle?.trim() || "";
  const hasRealTitle =
    hasText(title) && title.toLowerCase() !== DEFAULT_PROFILE_TITLE.toLowerCase();
  const pricing = p.pricing || { chatPerMin: 0, callPerMin: 0, videoPerMin: 0 };
  const hasPricing =
    Number(pricing.chatPerMin) > 0 &&
    Number(pricing.callPerMin) > 0 &&
    Number(pricing.videoPerMin) > 0;
  const hasAvailability = Object.values(p.weeklySchedule || {}).some(
    (day) => !!day?.enabled && hasText(day.from) && hasText(day.to)
  );

  return (
    hasText(u.name) &&
    hasText(u.email) &&
    hasText(u.phone) &&
    hasText(u.country) &&
    hasText(u.city) &&
    hasText(u.profilePhoto) &&
    hasRealTitle &&
    (hasText(p.bio) || hasText(p.detailedDescription)) &&
    hasText(p.yearsOfExperience) &&
    (p.expertise || []).length > 0 &&
    (p.styles || []).length > 0 &&
    (p.languages || []).length > 0 &&
    hasText(p.introVideoUrl) &&
    hasPricing &&
    hasAvailability
  );
};

const getAdvisorProfileRedirectPath = async () => {
  const r = await api.get<AdvisorProfileResponse>("/advisor/profile");
  return isAdvisorProfileComplete(r.data) ? "/" : PROFILE_PATH;
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
    if (isOpenPath(pathname)) return; // never redirect to/from open paths
    const onPublic = isPublicPath(pathname);
    if (!user && !onPublic) {
      router.replace("/login");
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
      let nextPath = PROFILE_PATH;
      try {
        nextPath = await getAdvisorProfileRedirectPath();
      } catch {
        nextPath = PROFILE_PATH;
      }
      router.replace(nextPath);
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
