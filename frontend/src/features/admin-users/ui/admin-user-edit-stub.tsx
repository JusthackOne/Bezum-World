"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAdminAuthStore } from "@/features/auth/model";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface AdminUserEditStubProps {
  userId: string;
}

export function AdminUserEditStub({ userId }: AdminUserEditStubProps) {
  const router = useRouter();
  const session = useAdminAuthStore((state) => state.session);
  const isInitialized = useAdminAuthStore((state) => state.isInitialized);
  const initializeSession = useAdminAuthStore((state) => state.initializeSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!session?.accessToken) {
      router.replace("/admin/login");
    }
  }, [isInitialized, router, session?.accessToken]);

  if (!isInitialized || !session) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>User Edit</CardTitle>
          <CardDescription>Loading admin session...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>User Edit (Stub)</CardTitle>
        <CardDescription>Editing page for user ID: {userId}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>
          Back to users
        </Button>
      </CardContent>
    </Card>
  );
}
