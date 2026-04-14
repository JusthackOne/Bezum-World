"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAdminLoginMutation } from "@/features/auth/api";
import { useAdminAuthStore } from "@/features/auth/model";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { Input } from "@/shared/ui/8bit/input";

const adminLoginSchema = z.object({
  username: z.string().min(3, "Username must contain at least 3 characters").max(64),
  password: z.string().min(8, "Password must contain at least 8 characters").max(256),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export function AdminLoginForm() {
  const router = useRouter();
  const loginMutation = useAdminLoginMutation();
  const session = useAdminAuthStore((state) => state.session);
  const isInitialized = useAdminAuthStore((state) => state.isInitialized);
  const initializeSession = useAdminAuthStore((state) => state.initializeSession);
  const setSession = useAdminAuthStore((state) => state.setSession);

  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized || !session?.accessToken) {
      return;
    }

    router.replace("/admin/users");
  }, [isInitialized, router, session?.accessToken]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await loginMutation.mutateAsync(values);
    setSession(result);
    router.replace("/admin/users");
  });

  const mutationError =
    loginMutation.error instanceof Error ? loginMutation.error.message : "Unable to login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Sign in with your admin credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                autoComplete="username"
                placeholder="admin"
                {...form.register("username")}
              />
              {form.formState.errors.username ? (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="********"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            {loginMutation.isError ? <p className="text-sm text-destructive">{mutationError}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || !isInitialized}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
