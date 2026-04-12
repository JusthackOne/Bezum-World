"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuthStatusQuery } from "@/features/auth/api";
import { useAuthUiStore } from "@/features/auth/model";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

const authStubSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type AuthStubFormValues = z.infer<typeof authStubSchema>;

export function AuthStubCard() {
  const { data, isPending } = useAuthStatusQuery();
  const { isLoginPanelOpen, toggleLoginPanel } = useAuthUiStore();

  const form = useForm<AuthStubFormValues>({
    resolver: zodResolver(authStubSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = form.handleSubmit(() => {
    toggleLoginPanel();
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Auth Feature Stub</CardTitle>
        <CardDescription>
          No real auth flow yet. This module only demonstrates project structure and state setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3 text-sm">
          <p>
            React Query status:{" "}
            <span className="font-medium">{isPending ? "loading" : "ready"}</span>
          </p>
          <p className="text-muted-foreground">
            {data?.data.message ?? "Waiting for stub server state response"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email (stub form)
            </label>
            <Input
              id="email"
              type="email"
              placeholder="player@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit">Toggle Login Panel State</Button>
            <span className="text-xs text-muted-foreground">
              Zustand state: {isLoginPanelOpen ? "open" : "closed"}
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
