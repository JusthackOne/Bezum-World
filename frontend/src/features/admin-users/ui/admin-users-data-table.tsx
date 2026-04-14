"use client";

import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useDeleteAdminUserMutation, useAdminUsersQuery } from "@/features/admin-users/api";
import { queryKeys } from "@/shared/config/query-keys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/8bit/alert-dialog";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { Checkbox } from "@/shared/ui/8bit/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/8bit/table";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/shared/ui/8bit/toast";

type CheckboxState = boolean | "indeterminate";
type ToastVariant = "default" | "destructive";

interface ToastState {
  key: number;
  open: boolean;
  title: string;
  description: string;
  variant: ToastVariant;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "N/A";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}

export function AdminUsersDataTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const usersQuery = useAdminUsersQuery(true, true);
  const deleteUserMutation = useDeleteAdminUserMutation();

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toastState, setToastState] = useState<ToastState>({
    key: 0,
    open: false,
    title: "",
    description: "",
    variant: "default",
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const availableUserIds = useMemo(() => new Set(users.map((user) => user.id)), [users]);
  const selectedExistingUserIds = useMemo(
    () => Array.from(selectedUserIds).filter((userId) => availableUserIds.has(userId)),
    [availableUserIds, selectedUserIds],
  );
  const selectedCount = selectedExistingUserIds.length;
  const allSelected = users.length > 0 && selectedCount === users.length;
  const selectAllState: CheckboxState = allSelected
    ? true
    : selectedCount > 0
      ? "indeterminate"
      : false;

  const deletionLabel = useMemo(() => {
    if (selectedCount === 0) {
      return "Delete selected";
    }

    if (selectedCount === 1) {
      return "Delete 1 user";
    }

    return `Delete ${selectedCount} users`;
  }, [selectedCount]);

  function pushToast(title: string, description: string, variant: ToastVariant = "default") {
    setToastState((previousState) => ({
      key: previousState.key + 1,
      open: true,
      title,
      description,
      variant,
    }));
  }

  function handleSelectAll(checked: CheckboxState) {
    if (checked === true) {
      setSelectedUserIds(new Set(users.map((user) => user.id)));
      return;
    }

    setSelectedUserIds(new Set());
  }

  function handleSelectUser(userId: string, checked: CheckboxState) {
    setSelectedUserIds((previousIds) => {
      const nextIds = new Set(previousIds);

      if (checked === true) {
        nextIds.add(userId);
      } else {
        nextIds.delete(userId);
      }

      return nextIds;
    });
  }

  async function handleConfirmDelete() {
    const userIdsForDeletion = selectedExistingUserIds;

    if (userIdsForDeletion.length === 0) {
      return;
    }

    const deletionResults = await Promise.allSettled(
      userIdsForDeletion.map((userId) => deleteUserMutation.mutateAsync(userId)),
    );

    const deletedIds: string[] = [];
    let failedCount = 0;

    deletionResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        deletedIds.push(userIdsForDeletion[index]);
      } else {
        failedCount += 1;
      }
    });

    if (deletedIds.length > 0) {
      setSelectedUserIds((previousIds) => {
        const nextIds = new Set(previousIds);
        deletedIds.forEach((deletedId) => nextIds.delete(deletedId));
        return nextIds;
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    }

    if (failedCount === 0) {
      pushToast(
        "Users deleted",
        `${deletedIds.length} user${deletedIds.length === 1 ? "" : "s"} deleted successfully.`,
      );
      return;
    }

    pushToast(
      "Deletion completed with errors",
      `Deleted: ${deletedIds.length}. Failed: ${failedCount}.`,
      "destructive",
    );
  }

  const isDeleting = deleteUserMutation.isPending;
  const isDeleteDisabled = selectedCount === 0 || isDeleting;

  if (usersQuery.isError) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Failed to Load Users</CardTitle>
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

  return (
    <ToastProvider duration={3000} swipeDirection="right">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="text-muted-foreground text-sm">Manage player accounts and base attributes.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/users/create")}>
              <PlusIcon className="size-4" />
              Add user
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isDeleteDisabled}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2Icon className="size-4" />
              {isDeleting ? "Deleting..." : deletionLabel}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Users Table</CardTitle>
            <CardDescription>
              {usersQuery.isPending ? "Loading users..." : `${users.length} user${users.length === 1 ? "" : "s"} loaded`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all users"
                      checked={selectAllState}
                      onCheckedChange={(checked) => handleSelectAll(checked as CheckboxState)}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Auth Code</TableHead>
                  <TableHead>Avatar URL</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Charisma</TableHead>
                  <TableHead>Endurance</TableHead>
                  <TableHead>Intelligence</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isPending ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground text-center" colSpan={12}>
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground text-center" colSpan={12}>
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const isSelected = selectedUserIds.has(user.id);

                    return (
                      <TableRow
                        key={user.id}
                        data-state={isSelected ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                      >
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select user ${user.username}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleSelectUser(user.id, checked as CheckboxState)
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate font-mono text-xs">{user.id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell className="font-mono text-xs">{user.code ?? "N/A"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {user.avatarUrl ?? "N/A"}
                        </TableCell>
                        <TableCell>{user.balance}</TableCell>
                        <TableCell>{user.strength}</TableCell>
                        <TableCell>{user.charisma}</TableCell>
                        <TableCell>{user.endurance}</TableCell>
                        <TableCell>{user.intelligence}</TableCell>
                        <TableCell>{formatDate(user.lastTimeLoggedIn)}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete selected users?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to delete {selectedCount} selected user{selectedCount === 1 ? "" : "s"}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={isDeleteDisabled}
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  void handleConfirmDelete();
                }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <Toast
        key={toastState.key}
        open={toastState.open}
        onOpenChange={(open) => setToastState((previousState) => ({ ...previousState, open }))}
        variant={toastState.variant}
      >
        <div className="grid gap-1">
          <ToastTitle>{toastState.title}</ToastTitle>
          <ToastDescription>{toastState.description}</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
