"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useAdminItemsQuery, useDeleteAdminItemMutation } from "@/features/admin-items/api";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";

interface AdminItemEditFormProps {
  itemId: string;
}

export function AdminItemEditForm({ itemId }: AdminItemEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const itemsQuery = useAdminItemsQuery(true, true, "all");
  const deleteItemMutation = useDeleteAdminItemMutation();
  const item = useMemo(
    () => (itemsQuery.data ?? []).find((nextItem) => nextItem.id === itemId) ?? null,
    [itemId, itemsQuery.data],
  );

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
        <CardTitle>Item Details</CardTitle>
        <CardDescription>
          Edit endpoint is not available yet. This page is prepared for future editing support.
        </CardDescription>
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

        <div className="grid grid-cols-1 gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">ID:</span> {item.id}
          </div>
          <div>
            <span className="font-medium">Owner User ID:</span> {item.owner_user_id ?? "N/A"}
          </div>
          <div>
            <span className="font-medium">Name:</span> {item.name}
          </div>
          <div>
            <span className="font-medium">Description:</span> {item.description ?? "N/A"}
          </div>
          <div>
            <span className="font-medium">Image URL:</span> {item.image_url ?? "N/A"}
          </div>
          <div>
            <span className="font-medium">Strength:</span> {item.strength ?? "N/A"}
          </div>
          <div>
            <span className="font-medium">Charisma:</span> {item.charisma ?? "N/A"}
          </div>
          <div>
            <span className="font-medium">Agility:</span> {item.agility ?? "N/A"}
          </div>
          <div>
            <span className="font-medium">Intelligence:</span> {item.intelligence ?? "N/A"}
          </div>
          <div>
            <span className="font-medium">Price:</span> {item.price}
          </div>
          <div>
            <span className="font-medium">Rarity:</span> {item.rarity}
          </div>
          <div>
            <span className="font-medium">Durability:</span> {item.durability ?? "N/A"}
          </div>
          <div className="sm:col-span-2">
            <span className="font-medium">Created At:</span> {item.created_at}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
