"use client";

import { create } from "zustand";
import { z } from "zod";

import type { ClientAuthTokensResponse } from "@/features/auth/model/client-auth.types";

const CLIENT_AUTH_SESSION_STORAGE_KEY = "client-auth-session";

const clientSessionSchema = z.object({
  accessToken: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    avatarUrl: z.string().nullable(),
    balance: z.number(),
    strength: z.number(),
    charisma: z.number(),
    endurance: z.number(),
    intelligence: z.number(),
    lastTimeLoggedIn: z.string().nullable(),
    createdAt: z.string().min(1),
  }),
});

interface ClientAuthState {
  session: ClientAuthTokensResponse | null;
  isInitialized: boolean;
  initializeSession: () => void;
  setSession: (session: ClientAuthTokensResponse) => void;
  clearSession: () => void;
}

function readStoredSession(): ClientAuthTokensResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(CLIENT_AUTH_SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    const validatedSession = clientSessionSchema.safeParse(parsedValue);

    if (!validatedSession.success) {
      window.localStorage.removeItem(CLIENT_AUTH_SESSION_STORAGE_KEY);
      return null;
    }

    return validatedSession.data;
  } catch {
    window.localStorage.removeItem(CLIENT_AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: ClientAuthTokensResponse | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (session === null) {
    window.localStorage.removeItem(CLIENT_AUTH_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(CLIENT_AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export const useClientAuthStore = create<ClientAuthState>((set, get) => ({
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
