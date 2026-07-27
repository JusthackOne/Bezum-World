"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { PublicUserItem } from "@/features/public-user/model/public-user.types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/8bit/dialog";
import { Input } from "@/shared/ui/8bit/input";

const listItemFormSchema = z.object({
  price: z
    .number({ error: "Selling price is required." })
    .int("Selling price must be a whole number.")
    .min(0, "Selling price must be at least 0 Gold.")
    .max(2_147_483_647, "Selling price is too large."),
});

type ListItemFormValues = z.infer<typeof listItemFormSchema>;

interface ItemMarketplaceDialogsProps {
  itemToList: PublicUserItem | null;
  itemToRemove: PublicUserItem | null;
  isPending: boolean;
  onListOpenChange: (open: boolean) => void;
  onRemoveOpenChange: (open: boolean) => void;
  onList: (itemId: string, price: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}

export function ItemMarketplaceDialogs({
  itemToList,
  itemToRemove,
  isPending,
  onListOpenChange,
  onRemoveOpenChange,
  onList,
  onRemove,
}: ItemMarketplaceDialogsProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const form = useForm<ListItemFormValues>({
    resolver: zodResolver(listItemFormSchema),
    defaultValues: { price: 0 },
  });

  const closeListDialog = () => {
    form.reset({ price: 0 });
    setSubmissionError(null);
    onListOpenChange(false);
  };

  const handleList = form.handleSubmit(async ({ price }) => {
    if (!itemToList) {
      return;
    }

    setSubmissionError(null);

    try {
      await onList(itemToList.id, price);
      closeListDialog();
    } catch (error: unknown) {
      setSubmissionError(error instanceof Error ? error.message : "Failed to list item for sale.");
    }
  });

  return (
    <>
      <Dialog
        open={itemToList !== null}
        onOpenChange={(open) => {
          if (!isPending) {
            if (!open) {
              closeListDialog();
            }
          }
        }}
      >
        <DialogContent font="normal">
          <DialogHeader>
            <DialogTitle>List item for sale</DialogTitle>
            <DialogDescription>
              {itemToList
                ? `Set the Gold price for “${itemToList.name}”.`
                : "Set a selling price for this item."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleList}>
            <div className="space-y-2">
              <label htmlFor="listing-price" className="text-sm font-medium">
                Selling price (Gold)
              </label>
              <Input
                id="listing-price"
                type="number"
                min={0}
                step={1}
                required
                disabled={isPending}
                aria-invalid={Boolean(form.formState.errors.price)}
                {...form.register("price", { valueAsNumber: true })}
              />
              {form.formState.errors.price ? (
                <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
              ) : null}
              {submissionError ? (
                <p className="text-sm text-destructive">{submissionError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={closeListDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Listing..." : "List Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={itemToRemove !== null}
        onOpenChange={(open) => {
          if (!isPending) {
            setRemoveError(null);
            onRemoveOpenChange(open);
          }
        }}
      >
        <AlertDialogContent font="normal">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item from sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from sale?
            </AlertDialogDescription>
            {removeError ? <p className="text-sm text-destructive">{removeError}</p> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={async (event) => {
                event.preventDefault();

                if (!itemToRemove) {
                  return;
                }

                setRemoveError(null);

                try {
                  await onRemove(itemToRemove.id);
                  onRemoveOpenChange(false);
                } catch (error: unknown) {
                  setRemoveError(
                    error instanceof Error ? error.message : "Failed to remove item from sale.",
                  );
                }
              }}
            >
              {isPending ? "Removing..." : "Remove from Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
