"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  useAdminUsersQuery,
  useUpdateAdminUserMutation,
  useUserProfileByUsernameQuery,
} from "@/features/admin-users/api";
import type {
  AdminUpdateUserInput,
  AdminUser,
  UserProfileByUsername,
} from "@/features/admin-users/model/admin-user.types";
import { queryKeys } from "@/shared/config/query-keys";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { AdminUserForm, type AdminUserFormValues } from "./admin-user-form";

interface AdminUserEditFormProps {
  userId: string;
}

function toFormValues(user: AdminUser): AdminUserFormValues {
  return {
    username: user.username,
    balance: user.balance,
    strength: user.strength,
    charisma: user.charisma,
    endurance: user.endurance,
    intelligence: user.intelligence,
  };
}

function toFormValuesFromProfile(user: UserProfileByUsername): AdminUserFormValues {
  return {
    username: user.username,
    balance: user.balance,
    strength: user.attributes.strength,
    charisma: user.attributes.charisma,
    endurance: user.attributes.endurance,
    intelligence: user.attributes.intelligence,
  };
}

export function AdminUserEditForm({ userId }: AdminUserEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateUserMutation = useUpdateAdminUserMutation();
  const [showSuccess, setShowSuccess] = useState(false);
  const usersQuery = useAdminUsersQuery(true, true);
  const user = useMemo(
    () => (usersQuery.data ?? []).find((nextUser) => nextUser.id === userId) ?? null,
    [userId, usersQuery.data],
  );
  const userProfileQuery = useUserProfileByUsernameQuery(user?.username ?? null, Boolean(user));
  const initialFormValues = useMemo(
    () =>
      userProfileQuery.data
        ? toFormValuesFromProfile(userProfileQuery.data)
        : user
          ? toFormValues(user)
          : undefined,
    [user, userProfileQuery.data],
  );
  const avatarUrl = userProfileQuery.data?.profilePhoto ?? user?.avatarUrl ?? null;

  const mutationError =
    updateUserMutation.error instanceof Error
      ? updateUserMutation.error.message
      : "Unable to update user";

  if (usersQuery.isPending) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (usersQuery.isError) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Failed to Load User</CardTitle>
          <CardDescription>
            {usersQuery.error instanceof Error ? usersQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => usersQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>User Not Found</CardTitle>
          <CardDescription>User with ID {userId} does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>
            <ArrowLeftIcon className="size-4" />
            Back to users
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (userProfileQuery.isPending && !userProfileQuery.data) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
          <CardDescription>Loading user profile...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (userProfileQuery.isError) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Failed to Load User</CardTitle>
          <CardDescription>
            {userProfileQuery.error instanceof Error
              ? userProfileQuery.error.message
              : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => userProfileQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
        <CardDescription>Update player profile and base attributes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>
            <ArrowLeftIcon className="size-4" />
            Back to users
          </Button>
        </div>

        {showSuccess ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2Icon className="size-4" />
              User updated successfully
            </div>
          </div>
        ) : null}

        <AdminUserForm
          initialValues={initialFormValues}
          initialAvatarUrl={avatarUrl}
          submitLabel="Save changes"
          submitPendingLabel="Saving..."
          isSubmitting={updateUserMutation.isPending}
          errorMessage={updateUserMutation.isError ? mutationError : null}
          onSubmit={async (values: AdminUserFormValues, avatarFile: File | null) => {
            setShowSuccess(false);

            const payload: AdminUpdateUserInput = {
              userId,
              username: values.username.trim(),
              balance: values.balance,
              strength: values.strength,
              charisma: values.charisma,
              endurance: values.endurance,
              intelligence: values.intelligence,
              avatarFile,
              avatarUrl,
            };

            await updateUserMutation.mutateAsync(payload);
            await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
            setShowSuccess(true);
          }}
        />
      </CardContent>
    </Card>
  );
}
