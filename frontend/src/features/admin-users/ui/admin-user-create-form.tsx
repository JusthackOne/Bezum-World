"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCreateAdminUserMutation } from "@/features/admin-users/api";
import { queryKeys } from "@/shared/config/query-keys";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { AdminUserForm, type AdminUserFormValues } from "./admin-user-form";

export function AdminUserCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createUserMutation = useCreateAdminUserMutation();
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);

  const mutationError =
    createUserMutation.error instanceof Error
      ? createUserMutation.error.message
      : "Unable to create user";

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

        <AdminUserForm
          key={resetToken}
          submitLabel="Create user"
          submitPendingLabel="Creating..."
          isSubmitting={createUserMutation.isPending}
          errorMessage={createUserMutation.isError ? mutationError : null}
          onSubmit={async (values: AdminUserFormValues, nextAvatarFile: File | null) => {
            const payload = {
              username: values.username.trim(),
              balance: values.balance,
              strength: values.strength,
              charisma: values.charisma,
              endurance: values.endurance,
              intelligence: values.intelligence,
              avatarFile: nextAvatarFile,
            };

            const result = await createUserMutation.mutateAsync(payload);
            setCreatedCode(result.code);
            await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
            setResetToken((previousToken) => previousToken + 1);
          }}
        />
      </CardContent>
    </Card>
  );
}
