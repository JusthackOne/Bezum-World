"use client";

import { create } from "zustand";
import { z } from "zod";

import type { AdminAuthTokensResponse } from "@/features/auth/model/admin-auth.types";

const ADMIN_AUTH_SESSION_STORAGE_KEY = "admin-auth-session";

const adminSessionSchema = z.object({
  accessToken: z.string().min(1),
  admin: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    lastTimeLoggedIn: z.string().nullable(),
    createdAt: z.string().min(1),
  }),
});

interface AdminAuthState {
  session: AdminAuthTokensResponse | null;
  isInitialized: boolean;
  initializeSession: () => void;
  setSession: (session: AdminAuthTokensResponse) => void;
  clearSession: () => void;
}

function readStoredSession(): AdminAuthTokensResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    const validatedSession = adminSessionSchema.safeParse(parsedValue);

    if (!validatedSession.success) {
      window.localStorage.removeItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
      return null;
    }

    return validatedSession.data;
  } catch {
    window.localStorage.removeItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: AdminAuthTokensResponse | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (session === null) {
    window.localStorage.removeItem(ADMIN_AUTH_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ADMIN_AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  session: null,
  isInitialized: false,
  initializeSession: () => {
    if (get().isInitialized) {
      return;
    }

    set({
      session: readStoredSession(),
      isInitialized: true,
    });
  },
  setSession: (session) => {
    writeStoredSession(session);
    set({ session });
  },
  clearSession: () => {
    writeStoredSession(null);
    set({ session: null });
  },
}));
