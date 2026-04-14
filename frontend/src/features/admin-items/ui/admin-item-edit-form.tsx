"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useAdminItemsQuery } from "@/features/admin-items/api";
import { useAdminAuthStore } from "@/features/auth/model";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface AdminItemEditFormProps {
  itemId: string;
}

export function AdminItemEditForm({ itemId }: AdminItemEditFormProps) {
  const router = useRouter();

  const session = useAdminAuthStore((state) => state.session);
  const isInitialized = useAdminAuthStore((state) => state.isInitialized);
  const initializeSession = useAdminAuthStore((state) => state.initializeSession);
  const clearSession = useAdminAuthStore((state) => state.clearSession);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!session?.accessToken) {
      clearSession();
      router.replace("/admin/login");
    }
  }, [clearSession, isInitialized, router, session?.accessToken]);

  const hasAdminSession = Boolean(session?.accessToken);
  const itemsQuery = useAdminItemsQuery(isInitialized, hasAdminSession, "all");
  const item = useMemo(
    () => (itemsQuery.data ?? []).find((nextItem) => nextItem.id === itemId) ?? null,
    [itemId, itemsQuery.data],
  );

  if (!isInitialized || !session) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Item</CardTitle>
          <CardDescription>Loading admin session...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
          <div><span className="font-medium">ID:</span> {item.id}</div>
          <div><span className="font-medium">Owner User ID:</span> {item.owner_user_id ?? "N/A"}</div>
          <div><span className="font-medium">Name:</span> {item.name}</div>
          <div><span className="font-medium">Description:</span> {item.description ?? "N/A"}</div>
          <div><span className="font-medium">Image URL:</span> {item.image_url ?? "N/A"}</div>
          <div><span className="font-medium">Strength:</span> {item.strength ?? "N/A"}</div>
          <div><span className="font-medium">Charisma:</span> {item.charisma ?? "N/A"}</div>
          <div><span className="font-medium">Agility:</span> {item.agility ?? "N/A"}</div>
          <div><span className="font-medium">Intelligence:</span> {item.intelligence ?? "N/A"}</div>
          <div><span className="font-medium">Price:</span> {item.price}</div>
          <div><span className="font-medium">Rarity:</span> {item.rarity}</div>
          <div><span className="font-medium">Durability:</span> {item.durability ?? "N/A"}</div>
          <div className="sm:col-span-2"><span className="font-medium">Created At:</span> {item.created_at}</div>
        </div>
      </CardContent>
    </Card>
  );
}
