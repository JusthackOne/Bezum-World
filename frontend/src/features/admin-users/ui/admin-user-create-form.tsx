"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useCreateAdminUserMutation } from "@/features/admin-users/api";
import { useAdminAuthStore } from "@/features/auth/model";
import { queryKeys } from "@/shared/config/query-keys";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64),
  balance: z.number().int().min(0),
  strength: z.number().int().min(0).max(100),
  charisma: z.number().int().min(0).max(100),
  endurance: z.number().int().min(0).max(100),
  intelligence: z.number().int().min(0).max(100),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const defaultFormValues: CreateUserFormValues = {
  username: "",
  balance: 0,
  strength: 0,
  charisma: 0,
  endurance: 0,
  intelligence: 0,
};

export function AdminUserCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createUserMutation = useCreateAdminUserMutation();
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const session = useAdminAuthStore((state) => state.session);
  const isInitialized = useAdminAuthStore((state) => state.isInitialized);
  const initializeSession = useAdminAuthStore((state) => state.initializeSession);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: defaultFormValues,
  });

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

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      username: values.username.trim(),
      balance: values.balance,
      strength: values.strength,
      charisma: values.charisma,
      endurance: values.endurance,
      intelligence: values.intelligence,
      avatarFile,
    };

    const result = await createUserMutation.mutateAsync(payload);
    setCreatedCode(result.code);
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    setAvatarFile(null);
    form.reset(defaultFormValues);
  });

  const mutationError =
    createUserMutation.error instanceof Error
      ? createUserMutation.error.message
      : "Unable to create user";

  if (!isInitialized || !session) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>Loading admin session...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Create User</CardTitle>
        <CardDescription>Create a new player account and generate login code.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>
            <ArrowLeftIcon className="size-4" />
            Back to users
          </Button>
        </div>

        {createdCode ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2Icon className="size-4" />
              User created successfully
            </div>
            <p className="mt-2 text-sm">
              Generated auth code: <span className="font-mono font-semibold">{createdCode}</span>
            </p>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input id="username" placeholder="player_001" {...form.register("username")} />
            {form.formState.errors.username ? (
              <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="avatar" className="text-sm font-medium">
              Avatar (optional)
            </label>
            <Input
              id="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setAvatarFile(nextFile);
              }}
            />
            <p className="text-muted-foreground text-xs">Allowed: JPG, PNG, WEBP, GIF (up to 5MB).</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="balance" className="text-sm font-medium">
                Balance
              </label>
              <Input
                id="balance"
                type="number"
                min={0}
                {...form.register("balance", { valueAsNumber: true })}
              />
              {form.formState.errors.balance ? (
                <p className="text-xs text-destructive">{form.formState.errors.balance.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="strength" className="text-sm font-medium">
                Strength
              </label>
              <Input
                id="strength"
                type="number"
                min={0}
                max={100}
                {...form.register("strength", { valueAsNumber: true })}
              />
              {form.formState.errors.strength ? (
                <p className="text-xs text-destructive">{form.formState.errors.strength.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="charisma" className="text-sm font-medium">
                Charisma
              </label>
              <Input
                id="charisma"
                type="number"
                min={0}
                max={100}
                {...form.register("charisma", { valueAsNumber: true })}
              />
              {form.formState.errors.charisma ? (
                <p className="text-xs text-destructive">{form.formState.errors.charisma.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="endurance" className="text-sm font-medium">
                Endurance
              </label>
              <Input
                id="endurance"
                type="number"
                min={0}
                max={100}
                {...form.register("endurance", { valueAsNumber: true })}
              />
              {form.formState.errors.endurance ? (
                <p className="text-xs text-destructive">{form.formState.errors.endurance.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="intelligence" className="text-sm font-medium">
                Intelligence
              </label>
              <Input
                id="intelligence"
                type="number"
                min={0}
                max={100}
                {...form.register("intelligence", { valueAsNumber: true })}
              />
              {form.formState.errors.intelligence ? (
                <p className="text-xs text-destructive">{form.formState.errors.intelligence.message}</p>
              ) : null}
            </div>
          </div>

          {createUserMutation.isError ? <p className="text-sm text-destructive">{mutationError}</p> : null}

          <Button type="submit" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? "Creating..." : "Create user"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
