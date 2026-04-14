"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

const optionalIntField = (min: number, max: number, label: string) =>
  z
    .union([
      z.literal(""),
      z.coerce.number().int().min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`),
    ])
    .transform<number | undefined>((value) => (value === "" ? undefined : value));

const itemFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(128),
  description: z.string().trim().min(1, "Description is required").max(4096),
  price: z.number().int().min(0).max(1000),
  rarity: z.enum(["unterlyanskiy", "basic_minimum", "sigma", "bezumnyy"]),
  slotType: z.enum(["HELMET", "ARMOR", "PANTS", "BOOTS", "LEFT_HAND", "RIGHT_HAND"]),
  strength: optionalIntField(0, 100, "Strength"),
  charisma: optionalIntField(0, 100, "Charisma"),
  agility: optionalIntField(0, 100, "Agility"),
  intelligence: optionalIntField(0, 100, "Intelligence"),
  durability: optionalIntField(0, 100, "Durability"),
});

type AdminItemFormInputValues = z.input<typeof itemFormSchema>;
export type AdminItemFormValues = z.output<typeof itemFormSchema>;

interface AdminItemFormProps {
  submitLabel: string;
  submitPendingLabel: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onSubmit: (values: AdminItemFormValues, imageFile: File | null) => Promise<void>;
}

const defaultFormValues: AdminItemFormInputValues = {
  name: "",
  description: "",
  price: 0,
  rarity: "basic_minimum",
  slotType: "RIGHT_HAND",
  strength: "",
  charisma: "",
  agility: "",
  intelligence: "",
  durability: "",
};

export function AdminItemForm({
  submitLabel,
  submitPendingLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
}: AdminItemFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<AdminItemFormInputValues, unknown, AdminItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: defaultFormValues,
  });

  const imagePreviewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);

  useEffect(() => {
    if (!imagePreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const displayImageUrl = imagePreviewUrl;

  const submitForm = form.handleSubmit(async (values) => {
    await onSubmit(values, imageFile);
  });

  return (
    <form onSubmit={submitForm} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Item Image (optional)</label>

        <div
          className="group relative h-36 w-36 cursor-pointer overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-muted/20"
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          {displayImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayImageUrl} alt="Item image preview" className="h-full w-full object-cover" />
          ) : null}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
              {displayImageUrl ? "Change" : "Select"}
            </span>
          </div>

          {!displayImageUrl ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="size-8" />
            </div>
          ) : null}
        </div>

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            setImageFile(nextFile);
          }}
        />

        <p className="text-muted-foreground text-xs">Allowed: JPG, PNG, WEBP, GIF (up to 5MB).</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <Input id="name" placeholder="Sigma Sword" {...form.register("name")} />
        {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          className="flex min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="A powerful and rare sword"
          {...form.register("description")}
        />
        {form.formState.errors.description ? (
          <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="price" className="text-sm font-medium">
            Price
          </label>
          <Input id="price" type="number" min={0} max={1000} {...form.register("price", { valueAsNumber: true })} />
          {form.formState.errors.price ? <p className="text-xs text-destructive">{form.formState.errors.price.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="rarity" className="text-sm font-medium">
            Rarity
          </label>
          <select
            id="rarity"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...form.register("rarity")}
          >
            <option value="unterlyanskiy">unterlyanskiy</option>
            <option value="basic_minimum">basic_minimum</option>
            <option value="sigma">sigma</option>
            <option value="bezumnyy">bezumnyy</option>
          </select>
          {form.formState.errors.rarity ? <p className="text-xs text-destructive">{form.formState.errors.rarity.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="slotType" className="text-sm font-medium">
            Slot Type
          </label>
          <select
            id="slotType"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...form.register("slotType")}
          >
            <option value="HELMET">HELMET</option>
            <option value="ARMOR">ARMOR</option>
            <option value="PANTS">PANTS</option>
            <option value="BOOTS">BOOTS</option>
            <option value="LEFT_HAND">LEFT_HAND</option>
            <option value="RIGHT_HAND">RIGHT_HAND</option>
          </select>
          {form.formState.errors.slotType ? (
            <p className="text-xs text-destructive">{form.formState.errors.slotType.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="strength" className="text-sm font-medium">
            Strength (optional)
          </label>
          <Input id="strength" type="number" min={0} max={100} {...form.register("strength")} />
          {form.formState.errors.strength ? <p className="text-xs text-destructive">{form.formState.errors.strength.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="charisma" className="text-sm font-medium">
            Charisma (optional)
          </label>
          <Input id="charisma" type="number" min={0} max={100} {...form.register("charisma")} />
          {form.formState.errors.charisma ? <p className="text-xs text-destructive">{form.formState.errors.charisma.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="agility" className="text-sm font-medium">
            Agility (optional)
          </label>
          <Input id="agility" type="number" min={0} max={100} {...form.register("agility")} />
          {form.formState.errors.agility ? <p className="text-xs text-destructive">{form.formState.errors.agility.message}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="intelligence" className="text-sm font-medium">
            Intelligence (optional)
          </label>
          <Input id="intelligence" type="number" min={0} max={100} {...form.register("intelligence")} />
          {form.formState.errors.intelligence ? (
            <p className="text-xs text-destructive">{form.formState.errors.intelligence.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="durability" className="text-sm font-medium">
            Durability (optional)
          </label>
          <Input id="durability" type="number" min={0} max={100} {...form.register("durability")} />
          {form.formState.errors.durability ? (
            <p className="text-xs text-destructive">{form.formState.errors.durability.message}</p>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className={cn("text-sm text-destructive")}>{errorMessage}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? submitPendingLabel : submitLabel}
      </Button>
    </form>
  );
}
