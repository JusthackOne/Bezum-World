"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAdminItemsQuery } from "@/features/admin-items/api";
import type { AdminItemLocationFilter } from "@/features/admin-items/model/admin-item.types";
import { env } from "@/shared/config/env";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/8bit/table";

function formatDate(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}

function resolveImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }

  return `${env.NEXT_PUBLIC_API_BASE_URL}${imageUrl}`;
}

const itemFilterOptions: Array<{ label: string; value: AdminItemLocationFilter }> = [
  { label: "All", value: "all" },
  { label: "Shop", value: "shop" },
  { label: "Inventory", value: "inventory" },
];

export function AdminItemsDataTable() {
  const router = useRouter();
  const [locationFilter, setLocationFilter] = useState<AdminItemLocationFilter>("all");
  const itemsQuery = useAdminItemsQuery(true, true, locationFilter);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  if (itemsQuery.isError) {
    return (
      <Card className="max-w-6xl">
        <CardHeader>
          <CardTitle>Failed to Load Items</CardTitle>
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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Items</h1>
          <p className="text-muted-foreground text-sm">Manage shop and inventory items.</p>
        </div>

        <Button type="button" variant="outline" onClick={() => router.push("/admin/items/create")}>
          <PlusIcon className="size-4" />
          Create Item
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {itemFilterOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={locationFilter === option.value ? "default" : "outline"}
            onClick={() => setLocationFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items Table</CardTitle>
          <CardDescription>
            {itemsQuery.isPending
              ? "Loading items..."
              : `${items.length} item${items.length === 1 ? "" : "s"} loaded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Owner User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Image URL</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Charisma</TableHead>
                <TableHead>Agility</TableHead>
                <TableHead>Intelligence</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Rarity</TableHead>
                <TableHead>Durability</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsQuery.isPending ? (
                <TableRow>
                  <TableCell className="text-muted-foreground text-center" colSpan={13}>
                    Loading items...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground text-center" colSpan={13}>
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const displayImageUrl = item.image_url ? resolveImageUrl(item.image_url) : null;

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/items/${item.id}`)}
                    >
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">
                        {item.owner_user_id ?? "N/A"}
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{item.description ?? "N/A"}</TableCell>
                      <TableCell className="max-w-[260px]">
                        {item.image_url ? (
                          <a
                            href={displayImageUrl ?? item.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {item.image_url}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>{item.strength ?? "N/A"}</TableCell>
                      <TableCell>{item.charisma ?? "N/A"}</TableCell>
                      <TableCell>{item.agility ?? "N/A"}</TableCell>
                      <TableCell>{item.intelligence ?? "N/A"}</TableCell>
                      <TableCell>{item.price}</TableCell>
                      <TableCell>{item.rarity}</TableCell>
                      <TableCell>{item.durability ?? "N/A"}</TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
