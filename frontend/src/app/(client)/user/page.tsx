"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";

function getPublicUserRoute(username: string): string {
  return `/users/${encodeURIComponent(username)}`;
}

export default function ClientUserPage() {
  const router = useRouter();
  const session = useClientAuthStore((state) => state.session);
  const isInitialized = useClientAuthStore((state) => state.isInitialized);
  const initializeSession = useClientAuthStore((state) => state.initializeSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const username = session?.user.username?.trim();
    if (!username) {
      router.replace("/login");
      return;
    }

    router.replace(getPublicUserRoute(username));
  }, [isInitialized, router, session?.user.username]);

  return null;
}
