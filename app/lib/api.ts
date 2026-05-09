"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

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

  const finalHeaders: Record<string, string> = { ...headers };
  if (!isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  let json: ApiEnvelope<T>;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(`Invalid JSON response (${res.status})`, res.status, null);
  }

  if (!res.ok || json.success === false) {
    const msg = json?.message || `Request failed (${res.status})`;
    if (res.status === 401) {
      clearAuth();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/signup") && !window.location.pathname.startsWith("/verify") && !window.location.pathname.startsWith("/forgot")) {
        window.location.href = "/login";
      }
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
