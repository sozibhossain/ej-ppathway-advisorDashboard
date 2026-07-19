"use client";

const DIRECT_API_BASE_URL = "https://187.77.10.158.sslip.io/api/v1";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

// Browser requests must target an absolute API origin; relative proxy paths are not used.
const API_BASE_URL = (
  configuredApiBaseUrl?.startsWith("http") ? configuredApiBaseUrl : DIRECT_API_BASE_URL
).replace(/\/+$/, "");

export const ACCESS_TOKEN_KEY = "ej_advisor_access_token";
export const REFRESH_TOKEN_KEY = "ej_advisor_refresh_token";
export const USER_KEY = "ej_advisor_user";

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown> & {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setAuth = (
  accessToken: string,
  refreshToken: string,
  user: unknown
) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = <T = unknown>(): T | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  isFormData?: boolean;
  skipAuth?: boolean;
};

const buildQuery = (
  query?: Record<string, string | number | boolean | undefined | null>
) => {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.append(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
};

let refreshPromise: Promise<string | null> | null = null;

const tryRefreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  const refresh = getRefreshToken();
  if (!refresh) return null;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as ApiEnvelope<{
        accessToken: string;
        refreshToken: string;
      }>;
      if (!json.success || !json.data?.accessToken) return null;
      setTokens(json.data.accessToken, json.data.refreshToken || refresh);
      return json.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (
    !path.startsWith("/login") &&
    !path.startsWith("/signup") &&
    !path.startsWith("/verify") &&
    !path.startsWith("/forgot") &&
    !path.startsWith("/reset")
  ) {
    window.location.href = "/login";
  }
};

const performFetch = async (
  url: string,
  finalHeaders: Record<string, string>,
  method: string,
  body: unknown,
  isFormData: boolean
) =>
  fetch(url, {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<ApiEnvelope<T>> {
  const {
    method = "GET",
    body,
    query,
    headers = {},
    isFormData = false,
    skipAuth = false,
  } = opts;

  const url = `${API_BASE_URL}${path}${buildQuery(query)}`;

  const buildHeaders = (token: string | null) => {
    const h: Record<string, string> = { ...headers };
    if (!isFormData) h["Content-Type"] = "application/json";
    if (!skipAuth && token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  let res = await performFetch(
    url,
    buildHeaders(skipAuth ? null : getAccessToken()),
    method,
    body,
    isFormData
  );

  // On 401, try a refresh + single retry. Skip for explicit-no-auth requests
  // and for the refresh endpoint itself to avoid recursion.
  if (
    res.status === 401 &&
    !skipAuth &&
    !path.startsWith("/auth/refresh") &&
    getRefreshToken()
  ) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      res = await performFetch(
        url,
        buildHeaders(newToken),
        method,
        body,
        isFormData
      );
    }
  }

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(`Invalid JSON response (${res.status})`, res.status, null);
  }

  if (!res.ok || json.success === false) {
    const msg = json?.message || `Request failed (${res.status})`;
    if (res.status === 401 && !skipAuth) {
      clearAuth();
      redirectToLogin();
    }
    throw new ApiError(msg, res.status, json);
  }
  return json;
}

export const api = {
  get: <T = unknown>(path: string, query?: RequestOptions["query"]) =>
    apiRequest<T>(path, { method: "GET", query }),
  post: <T = unknown>(path: string, body?: unknown, opts: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: "POST", body, ...opts }),
  put: <T = unknown>(path: string, body?: unknown, opts: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: "PUT", body, ...opts }),
  patch: <T = unknown>(path: string, body?: unknown, opts: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: "PATCH", body, ...opts }),
  delete: <T = unknown>(path: string, opts: Partial<RequestOptions> = {}) =>
    apiRequest<T>(path, { method: "DELETE", ...opts }),
};

export const API_BASE = API_BASE_URL;
