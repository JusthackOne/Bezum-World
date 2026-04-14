"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";

interface ClientPanelGuardProps {
  children: React.ReactNode;
}

export function ClientPanelGuard({ children }: ClientPanelGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const session = useClientAuthStore((state) => state.session);
  const isInitialized = useClientAuthStore((state) => state.isInitialized);
  const initializeSession = useClientAuthStore((state) => state.initializeSession);
  const clearSession = useClientAuthStore((state) => state.clearSession);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized || isLoginPage) {
      return;
    }

    if (!session?.accessToken) {
      clearSession();
      router.replace("/login");
    }
  }, [clearSession, isInitialized, isLoginPage, router, session?.accessToken]);

  if (!isInitialized) {
    return null;
  }

  if (!isLoginPage && !session?.accessToken) {
    return null;
  }

  return <>{children}</>;
}
