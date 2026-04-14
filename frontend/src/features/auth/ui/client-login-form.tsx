"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useClientLoginMutation } from "@/features/auth/api/use-client-login-mutation";
import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

const clientLoginSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Code must contain exactly 6 letters or digits"),
});

type ClientLoginFormValues = z.infer<typeof clientLoginSchema>;

export function ClientLoginForm() {
  const router = useRouter();
  const loginMutation = useClientLoginMutation();
  const session = useClientAuthStore((state) => state.session);
  const isInitialized = useClientAuthStore((state) => state.isInitialized);
  const initializeSession = useClientAuthStore((state) => state.initializeSession);
  const setSession = useClientAuthStore((state) => state.setSession);

  const form = useForm<ClientLoginFormValues>({
    resolver: zodResolver(clientLoginSchema),
    defaultValues: {
      code: "",
    },
  });

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized || !session?.accessToken) {
      return;
    }

    router.replace("/user");
  }, [isInitialized, router, session?.accessToken]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await loginMutation.mutateAsync({
      code: values.code,
    });

    setSession(result);
    router.replace("/user");
  });

  const mutationError =
    loginMutation.error instanceof Error ? loginMutation.error.message : "Unable to login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Client Login</CardTitle>
          <CardDescription>Sign in using your 6-character code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Access Code
              </label>
              <Input
                id="code"
                autoComplete="one-time-code"
                inputMode="text"
                maxLength={6}
                placeholder="A1B2C3"
                {...form.register("code")}
              />
              {form.formState.errors.code ? (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              ) : null}
            </div>

            {loginMutation.isError ? (
              <p className="text-sm text-destructive">{mutationError}</p>
            ) : null}

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
