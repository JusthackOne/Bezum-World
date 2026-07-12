"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  useAdminItemsQuery,
  useDeleteAdminItemMutation,
  useUpdateAdminItemMutation,
} from "@/features/admin-items/api";
import { queryKeys } from "@/shared/config/query-keys";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import {
  AdminItemForm,
  type AdminItemFormInitialValues,
  type AdminItemFormValues,
} from "./admin-item-form";

interface AdminItemEditFormProps {
  itemId: string;
}

export function AdminItemEditForm({ itemId }: AdminItemEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const itemsQuery = useAdminItemsQuery(true, true, "all");
  const updateItemMutation = useUpdateAdminItemMutation();
  const deleteItemMutation = useDeleteAdminItemMutation();
  const [wasSaved, setWasSaved] = useState(false);
  const item = useMemo(
    () => (itemsQuery.data ?? []).find((nextItem) => nextItem.id === itemId) ?? null,
    [itemId, itemsQuery.data],
  );
  const initialValues = useMemo<AdminItemFormInitialValues | null>(() => {
    if (!item) {
      return null;
    }

    return {
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      rarity: item.rarity,
      slotType: item.slotType,
      strength: item.strength ?? undefined,
      charisma: item.charisma ?? undefined,
      agility: item.agility ?? undefined,
      intelligence: item.intelligence ?? undefined,
      durability: item.durability ?? undefined,
      imageUrl: item.image_url,
    };
  }, [item]);

  const mutationError =
    updateItemMutation.error instanceof Error
      ? updateItemMutation.error.message
      : "Unable to update item";

  if (itemsQuery.isPending) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Item</CardTitle>
          <CardDescription>Loading item data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (itemsQuery.isError) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Failed to Load Item</CardTitle>
          <CardDescription>
            {itemsQuery.error instanceof Error ? itemsQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => itemsQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Item Not Found</CardTitle>
          <CardDescription>Item with ID {itemId} does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/items")}>
            <ArrowLeftIcon className="size-4" />
            Back to items
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit Item</CardTitle>
        <CardDescription>Update item stats, price, slot, rarity, and image.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/items")}>
            <ArrowLeftIcon className="size-4" />
            Back to items
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={deleteItemMutation.isPending}
            onClick={async () => {
              const shouldDelete = window.confirm(
                "Delete this item? This action cannot be undone.",
              );
              if (!shouldDelete) {
                return;
              }

              await deleteItemMutation.mutateAsync(item.id);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["admin", "items"] }),
                queryClient.invalidateQueries({ queryKey: ["shop", "items"] }),
              ]);
              router.push("/admin/items");
            }}
          >
            {deleteItemMutation.isPending ? "Deleting..." : "Delete Item"}
          </Button>
        </div>

        {wasSaved ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2Icon className="size-4" />
              Item updated successfully
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">ID:</span>{" "}
            <span className="font-mono text-xs">{item.id}</span>
          </div>
          <div>
            <span className="font-medium">Owner User ID:</span>{" "}
            {item.owner_user_id ? (
              <span className="font-mono text-xs">{item.owner_user_id}</span>
            ) : (
              "N/A"
            )}
          </div>
          <div className="sm:col-span-2">
            <span className="font-medium">Created At:</span> {item.created_at}
          </div>
        </div>

        {initialValues ? (
          <AdminItemForm
            key={item.id}
            initialValues={initialValues}
            submitLabel="Save changes"
            submitPendingLabel="Saving..."
            isSubmitting={updateItemMutation.isPending}
            errorMessage={updateItemMutation.isError ? mutationError : null}
            onSubmit={async (values: AdminItemFormValues, imageFile: File | null) => {
              const updatedItem = await updateItemMutation.mutateAsync({
                itemId: item.id,
                name: values.name.trim(),
                description: values.description.trim(),
                price: values.price,
                rarity: values.rarity,
                slotType: values.slotType,
                strength: values.strength,
                charisma: values.charisma,
                agility: values.agility,
                intelligence: values.intelligence,
                durability: values.durability,
                imageFile,
              });

              setWasSaved(true);
              queryClient.setQueryData(
                queryKeys.adminItems("all"),
                (currentItems: typeof itemsQuery.data) =>
                  currentItems?.map((nextItem) =>
                    nextItem.id === updatedItem.id ? updatedItem : nextItem,
                  ),
              );
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.adminItems("all") }),
                queryClient.invalidateQueries({ queryKey: queryKeys.adminItems("shop") }),
                queryClient.invalidateQueries({ queryKey: queryKeys.adminItems("inventory") }),
                queryClient.invalidateQueries({ queryKey: queryKeys.shopItems }),
              ]);
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
