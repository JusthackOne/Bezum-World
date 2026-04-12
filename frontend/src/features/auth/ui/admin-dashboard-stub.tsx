"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAdminAuthStore } from "@/features/auth/model";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function AdminDashboardStub() {
  const router = useRouter();
  const session = useAdminAuthStore((state) => state.session);
  const isInitialized = useAdminAuthStore((state) => state.isInitialized);
  const initializeSession = useAdminAuthStore((state) => state.initializeSession);
  const clearSession = useAdminAuthStore((state) => state.clearSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized || session?.accessToken) {
      return;
    }

    router.replace("/admin/login");
  }, [isInitialized, router, session?.accessToken]);

  const handleLogout = () => {
    clearSession();
    router.replace("/admin/login");
  };

  if (!isInitialized || !session) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Admin Area</CardTitle>
          <CardDescription>Loading admin session...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Admin Area (Stub)</CardTitle>
        <CardDescription>
          You are authenticated as <span className="font-semibold">{session.admin.username}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium">Admin ID:</span> {session.admin.id}
        </p>
        <p>
          <span className="font-medium">Created At:</span> {session.admin.createdAt}
        </p>
        <p>
          <span className="font-medium">Last Login:</span> {session.admin.lastTimeLoggedIn ?? "N/A"}
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={handleLogout}>
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}
