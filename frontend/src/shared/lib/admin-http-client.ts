import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { env } from "@/shared/config/env";
import { isApiSuccessResponse } from "@/shared/lib/api-response";
import { isRecord } from "@/shared/lib/type-guards";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

const ADMIN_AUTH_SESSION_STORAGE_KEY = "admin-auth-session";
const ADMIN_REFRESH_ENDPOINT = "/auth/admin/refresh";
const ADMIN_LOGIN_ENDPOINT = "/auth/admin/login";
const ADMIN_LOGIN_PAGE_PATH = "/admin/login";

interface StoredAdminSession {
  accessToken: string;
  admin: {
    id: string;
    username: string;
    lastTimeLoggedIn: string | null;
    createdAt: string;
  };
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshAccessTokenPromise: Promise<string> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function clearStoredAdminSession(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
}

function readStoredAdminSession(): StoredAdminSession | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (
      !isRecord(parsedValue) ||
      typeof parsedValue.accessToken !== "string" ||
      !isRecord(parsedValue.admin)
    ) {
      clearStoredAdminSession();
      return null;
    }

    const admin = parsedValue.admin;

    if (
      typeof admin.id !== "string" ||
      typeof admin.username !== "string" ||
      (admin.lastTimeLoggedIn !== null && typeof admin.lastTimeLoggedIn !== "string") ||
      typeof admin.createdAt !== "string"
    ) {
      clearStoredAdminSession();
      return null;
    }

    return {
      accessToken: parsedValue.accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
        lastTimeLoggedIn: admin.lastTimeLoggedIn,
        createdAt: admin.createdAt,
      },
    };
  } catch {
    clearStoredAdminSession();
    return null;
  }
}

function writeStoredAdminSession(session: StoredAdminSession): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ADMIN_AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function getStoredAdminAccessToken(): string | null {
  return readStoredAdminSession()?.accessToken ?? null;
}

function redirectToAdminLogin(): void {
  clearStoredAdminSession();

  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname !== ADMIN_LOGIN_PAGE_PATH) {
    window.location.replace(ADMIN_LOGIN_PAGE_PATH);
  }
}

function setAuthorizationHeader(config: InternalAxiosRequestConfig, accessToken: string): void {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
    return;
  }

  (config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
}

function hasAuthorizationHeader(config: InternalAxiosRequestConfig): boolean {
  if (config.headers instanceof AxiosHeaders) {
    const authorization = config.headers.get("Authorization");
    return typeof authorization === "string" && authorization.trim().length > 0;
  }

  const headers = config.headers as Record<string, unknown> | undefined;
  if (!headers) {
    return false;
  }

  const authorization = headers.Authorization ?? headers.authorization;

  return typeof authorization === "string" && authorization.trim().length > 0;
}

async function refreshAdminAccessToken(): Promise<string> {
  if (refreshAccessTokenPromise) {
    return refreshAccessTokenPromise;
  }

  refreshAccessTokenPromise = (async () => {
    const response = await axios.post<ApiSuccessResponse<StoredAdminSession>>(
      `${env.NEXT_PUBLIC_API_BASE_URL}${ADMIN_REFRESH_ENDPOINT}`,
      undefined,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!isApiSuccessResponse<StoredAdminSession>(response.data)) {
      throw new Error("Unexpected server response");
    }

    const refreshedSession = response.data.data;
    writeStoredAdminSession(refreshedSession);

    return refreshedSession.accessToken;
  })();

  try {
    return await refreshAccessTokenPromise;
  } finally {
    refreshAccessTokenPromise = null;
  }
}

export const adminHttpClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

adminHttpClient.interceptors.request.use((config) => {
  const requestUrl = config.url ?? "";
  const isRefreshRequest = requestUrl.includes(ADMIN_REFRESH_ENDPOINT);

  if (isRefreshRequest) {
    return config;
  }

  const storedAccessToken = getStoredAdminAccessToken();
  if (!storedAccessToken) {
    return config;
  }

  setAuthorizationHeader(config, storedAccessToken);

  return config;
});

adminHttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const statusCode = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (statusCode !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";
    const isRefreshRequest = requestUrl.includes(ADMIN_REFRESH_ENDPOINT);
    const isAdminLoginRequest = requestUrl.includes(ADMIN_LOGIN_ENDPOINT);

    if (isRefreshRequest) {
      redirectToAdminLogin();
      return Promise.reject(error);
    }

    if (isAdminLoginRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const hasTokenInRequest = hasAuthorizationHeader(originalRequest);
    const hasTokenInStorage = Boolean(getStoredAdminAccessToken());

    if (!hasTokenInRequest && !hasTokenInStorage) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshedAccessToken = await refreshAdminAccessToken();
      setAuthorizationHeader(originalRequest, refreshedAccessToken);

      return adminHttpClient(originalRequest);
    } catch (refreshError: unknown) {
      if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        redirectToAdminLogin();
      }

      return Promise.reject(refreshError);
    }
  },
);
