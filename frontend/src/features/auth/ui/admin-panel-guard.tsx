"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAdminAuthStore } from "@/features/auth/model";

interface AdminPanelGuardProps {
  children: React.ReactNode;
}

export function AdminPanelGuard({ children }: AdminPanelGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const session = useAdminAuthStore((state) => state.session);
  const isInitialized = useAdminAuthStore((state) => state.isInitialized);
  const initializeSession = useAdminAuthStore((state) => state.initializeSession);
  const clearSession = useAdminAuthStore((state) => state.clearSession);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized || isLoginPage) {
      return;
    }

    if (!session?.accessToken) {
      clearSession();
      router.replace("/admin/login");
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
