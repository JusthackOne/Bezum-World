"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CameraIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { env } from "@/shared/config/env";
import { Button } from "@/shared/ui/8bit/button";
import { Checkbox } from "@/shared/ui/8bit/checkbox";
import { Input } from "@/shared/ui/8bit/input";

const optionalIntField = (min: number, max: number, label: string) =>
  z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .int()
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} must be at most ${max}`),
    ])
    .transform<number | undefined>((value) => (value === "" ? undefined : value));

const taskFormSchema = z.object({
  type: z.enum(["daily", "weekly", "event"]),
  title: z.string().trim().min(1, "Title is required").max(256),
  description: z.string().trim().max(4096),
  image: z.string().trim().max(2048),
  rewardMoney: z.number().int().min(0),
  rewardGameScore: optionalIntField(0, 1_000_000, "Game score reward"),
  rewardStrength: optionalIntField(0, 100, "Strength reward"),
  rewardIntelligence: optionalIntField(0, 100, "Intelligence reward"),
  rewardCharisma: optionalIntField(0, 100, "Charisma reward"),
  rewardEndurance: optionalIntField(0, 100, "Endurance reward"),
  requiresProofImage: z.boolean(),
  submissionLimit: optionalIntField(1, 1000, "Submission limit"),
});

type AdminTaskFormInputValues = z.input<typeof taskFormSchema>;
export type AdminTaskFormValues = z.output<typeof taskFormSchema>;

interface AdminTaskFormProps {
  submitLabel: string;
  submitPendingLabel: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  initialValues?: AdminTaskFormValues;
  onSubmit: (values: AdminTaskFormValues, imageFile: File | null) => Promise<void>;
}

const defaultFormValues: AdminTaskFormInputValues = {
  type: "daily",
  title: "",
  description: "",
  image: "",
  rewardMoney: 0,
  rewardGameScore: "",
  rewardStrength: "",
  rewardIntelligence: "",
  rewardCharisma: "",
  rewardEndurance: "",
  requiresProofImage: false,
  submissionLimit: "",
};

export function AdminTaskForm({
  submitLabel,
  submitPendingLabel,
  isSubmitting,
  errorMessage,
  initialValues,
  onSubmit,
}: AdminTaskFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<AdminTaskFormInputValues, unknown, AdminTaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: initialValues ?? defaultFormValues,
  });
  const watchedType = useWatch({
    control: form.control,
    name: "type",
  });

  useEffect(() => {
    form.reset(initialValues ?? defaultFormValues);
  }, [form, initialValues]);

  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );

  useEffect(() => {
    if (!imagePreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const displayImageUrl = useMemo(() => {
    if (imagePreviewUrl) {
      return imagePreviewUrl;
    }

    const existingImage = initialValues?.image;
    if (!existingImage) {
      return null;
    }

    if (existingImage.startsWith("http://") || existingImage.startsWith("https://")) {
      return existingImage;
    }

    return `${env.NEXT_PUBLIC_API_BASE_URL}${existingImage}`;
  }, [imagePreviewUrl, initialValues?.image]);

  const submitForm = form.handleSubmit(async (values) => {
    await onSubmit(values, imageFile);
  });

  return (
    <form onSubmit={submitForm} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Task Image (optional)</label>

        <div className="relative h-28 w-28">
          <button
            type="button"
            className="group relative h-full w-full overflow-hidden rounded-full border border-dashed border-muted-foreground/40 bg-muted/20"
            onClick={() => fileInputRef.current?.click()}
          >
            {displayImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayImageUrl} alt="Task image preview" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <CameraIcon className="size-7" />
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground">
                <CameraIcon className="size-4" />
                {displayImageUrl ? "Change" : "Select"}
              </span>
            </div>
          </button>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...form.register("type")}
          >
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="event">event</option>
          </select>
          {form.formState.errors.type ? (
            <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="rewardMoney" className="text-sm font-medium">
            Reward Money
          </label>
          <Input
            id="rewardMoney"
            type="number"
            min={0}
            {...form.register("rewardMoney", { valueAsNumber: true })}
          />
          {form.formState.errors.rewardMoney ? (
            <p className="text-xs text-destructive">{form.formState.errors.rewardMoney.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input id="title" placeholder="Morning workout" {...form.register("title")} />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          className="flex min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Describe what user should do."
          {...form.register("description")}
        />
        {form.formState.errors.description ? (
          <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="rewardGameScore" className="text-sm font-medium">
            Reward Game Score (optional)
          </label>
          <Input id="rewardGameScore" type="number" min={0} {...form.register("rewardGameScore")} />
          {form.formState.errors.rewardGameScore ? (
            <p className="text-xs text-destructive">{form.formState.errors.rewardGameScore.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="submissionLimit" className="text-sm font-medium">
            Submission Limit {watchedType === "daily" ? "(daily only)" : "(ignored for current type)"}
          </label>
          <Input
            id="submissionLimit"
            type="number"
            min={1}
            disabled={watchedType !== "daily"}
            {...form.register("submissionLimit")}
          />
          {form.formState.errors.submissionLimit ? (
            <p className="text-xs text-destructive">{form.formState.errors.submissionLimit.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="rewardStrength" className="text-sm font-medium">
            Strength Reward (optional)
          </label>
          <Input id="rewardStrength" type="number" min={0} max={100} {...form.register("rewardStrength")} />
          {form.formState.errors.rewardStrength ? (
            <p className="text-xs text-destructive">{form.formState.errors.rewardStrength.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="rewardIntelligence" className="text-sm font-medium">
            Intelligence Reward (optional)
          </label>
          <Input
            id="rewardIntelligence"
            type="number"
            min={0}
            max={100}
            {...form.register("rewardIntelligence")}
          />
          {form.formState.errors.rewardIntelligence ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.rewardIntelligence.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="rewardCharisma" className="text-sm font-medium">
            Charisma Reward (optional)
          </label>
          <Input id="rewardCharisma" type="number" min={0} max={100} {...form.register("rewardCharisma")} />
          {form.formState.errors.rewardCharisma ? (
            <p className="text-xs text-destructive">{form.formState.errors.rewardCharisma.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="rewardEndurance" className="text-sm font-medium">
            Endurance Reward (optional)
          </label>
          <Input id="rewardEndurance" type="number" min={0} max={100} {...form.register("rewardEndurance")} />
          {form.formState.errors.rewardEndurance ? (
            <p className="text-xs text-destructive">{form.formState.errors.rewardEndurance.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Controller
          control={form.control}
          name="requiresProofImage"
          render={({ field }) => (
            <Checkbox
              id="requiresProofImage"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
            />
          )}
        />
        <label htmlFor="requiresProofImage" className="text-sm font-medium">
          Requires proof image
        </label>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? submitPendingLabel : submitLabel}
      </Button>
    </form>
  );
}
