"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCreateAdminItemMutation } from "@/features/admin-items/api";
import { queryKeys } from "@/shared/config/query-keys";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { AdminItemForm, type AdminItemFormValues } from "./admin-item-form";

export function AdminItemCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createItemMutation = useCreateAdminItemMutation();
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);

  const mutationError =
    createItemMutation.error instanceof Error
      ? createItemMutation.error.message
      : "Unable to create item";

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Create Item</CardTitle>
        <CardDescription>Create a new item in the shop.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/items")}>
            <ArrowLeftIcon className="size-4" />
            Back to items
          </Button>
        </div>

        {createdItemId ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2Icon className="size-4" />
              Item created successfully
            </div>
            <p className="mt-2 text-sm">
              Item ID: <span className="font-mono font-semibold">{createdItemId}</span>
            </p>
          </div>
        ) : null}

        <AdminItemForm
          submitLabel="Create item"
          submitPendingLabel="Creating..."
          isSubmitting={createItemMutation.isPending}
          errorMessage={createItemMutation.isError ? mutationError : null}
          onSubmit={async (values: AdminItemFormValues, imageFile: File | null) => {
            const payload = {
              name: values.name.trim(),
              description: values.description.trim(),
              image_url: values.image_url?.trim() ? values.image_url.trim() : undefined,
              price: values.price,
              rarity: values.rarity,
              strength: values.strength,
              charisma: values.charisma,
              agility: values.agility,
              intelligence: values.intelligence,
              durability: values.durability,
              imageFile,
            };

            const createdItem = await createItemMutation.mutateAsync(payload);
            setCreatedItemId(createdItem.id);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: queryKeys.adminItems("all") }),
              queryClient.invalidateQueries({ queryKey: queryKeys.adminItems("shop") }),
              queryClient.invalidateQueries({ queryKey: queryKeys.adminItems("inventory") }),
            ]);
          }}
        />
      </CardContent>
    </Card>
  );
}
