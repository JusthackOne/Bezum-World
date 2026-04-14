import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { env } from "@/shared/config/env";
import { isApiSuccessResponse } from "@/shared/lib/api-response";
import { isRecord } from "@/shared/lib/type-guards";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

const CLIENT_AUTH_SESSION_STORAGE_KEY = "client-auth-session";
const CLIENT_REFRESH_ENDPOINT = "/auth/refresh";
const CLIENT_LOGIN_ENDPOINT = "/auth/login/code";
const CLIENT_LOGIN_PAGE_PATH = "/login";

interface StoredClientSession {
  accessToken: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    balance: number;
    gameScore: number;
    strength: number;
    charisma: number;
    endurance: number;
    intelligence: number;
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

function clearStoredClientSession(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(CLIENT_AUTH_SESSION_STORAGE_KEY);
}

function isValidStoredUser(user: unknown): user is StoredClientSession["user"] {
  if (!isRecord(user)) {
    return false;
  }

  return (
    typeof user.id === "string" &&
    typeof user.username === "string" &&
    (user.avatarUrl === null || typeof user.avatarUrl === "string") &&
    typeof user.balance === "number" &&
    typeof user.gameScore === "number" &&
    typeof user.strength === "number" &&
    typeof user.charisma === "number" &&
    typeof user.endurance === "number" &&
    typeof user.intelligence === "number" &&
    (user.lastTimeLoggedIn === null || typeof user.lastTimeLoggedIn === "string") &&
    typeof user.createdAt === "string"
  );
}

function readStoredClientSession(): StoredClientSession | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(CLIENT_AUTH_SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (
      !isRecord(parsedValue) ||
      typeof parsedValue.accessToken !== "string" ||
      !isValidStoredUser(parsedValue.user)
    ) {
      clearStoredClientSession();
      return null;
    }

    return {
      accessToken: parsedValue.accessToken,
      user: parsedValue.user,
    };
  } catch {
    clearStoredClientSession();
    return null;
  }
}

function writeStoredClientSession(session: StoredClientSession): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(CLIENT_AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function getStoredClientAccessToken(): string | null {
  return readStoredClientSession()?.accessToken ?? null;
}

function redirectToClientLogin(): void {
  clearStoredClientSession();

  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname !== CLIENT_LOGIN_PAGE_PATH) {
    window.location.replace(CLIENT_LOGIN_PAGE_PATH);
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

async function refreshClientAccessToken(): Promise<string> {
  if (refreshAccessTokenPromise) {
    return refreshAccessTokenPromise;
  }

  refreshAccessTokenPromise = (async () => {
    const response = await axios.post<ApiSuccessResponse<StoredClientSession>>(
      `${env.NEXT_PUBLIC_API_BASE_URL}${CLIENT_REFRESH_ENDPOINT}`,
      undefined,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!isApiSuccessResponse<StoredClientSession>(response.data)) {
      throw new Error("Unexpected server response");
    }

    const refreshedSession = response.data.data;
    writeStoredClientSession(refreshedSession);

    return refreshedSession.accessToken;
  })();

  try {
    return await refreshAccessTokenPromise;
  } finally {
    refreshAccessTokenPromise = null;
  }
}

export const clientHttpClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

clientHttpClient.interceptors.request.use((config) => {
  const requestUrl = config.url ?? "";
  const isRefreshRequest = requestUrl.includes(CLIENT_REFRESH_ENDPOINT);

  if (isRefreshRequest) {
    return config;
  }

  const storedAccessToken = getStoredClientAccessToken();
  if (!storedAccessToken) {
    return config;
  }

  setAuthorizationHeader(config, storedAccessToken);

  return config;
});

clientHttpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const statusCode = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (statusCode !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";
    const isRefreshRequest = requestUrl.includes(CLIENT_REFRESH_ENDPOINT);
    const isClientLoginRequest = requestUrl.includes(CLIENT_LOGIN_ENDPOINT);

    if (isRefreshRequest) {
      redirectToClientLogin();
      return Promise.reject(error);
    }

    if (isClientLoginRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const hasTokenInRequest = hasAuthorizationHeader(originalRequest);
    const hasTokenInStorage = Boolean(getStoredClientAccessToken());

    if (!hasTokenInRequest && !hasTokenInStorage) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshedAccessToken = await refreshClientAccessToken();
      setAuthorizationHeader(originalRequest, refreshedAccessToken);

      return clientHttpClient(originalRequest);
    } catch (refreshError: unknown) {
      if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        redirectToClientLogin();
      }

      return Promise.reject(refreshError);
    }
  },
);
