"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CameraIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { env } from "@/shared/config/env";
import { Button } from "@/shared/ui/8bit/button";
import { Input } from "@/shared/ui/8bit/input";

const userFormSchema = z.object({
  code: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[a-zA-Z0-9]{6}$/.test(value), {
      message: "Код должен содержать ровно 6 латинских букв или цифр",
    }),
  username: z.string().trim().min(1, "Username is required").max(64),
  balance: z.number().int().min(0),
  gameScore: z.number().int().min(0),
  strength: z.number().int().min(0),
  charisma: z.number().int().min(0),
  endurance: z.number().int().min(0),
  intelligence: z.number().int().min(0),
});

export type AdminUserFormValues = z.infer<typeof userFormSchema>;

interface AdminUserFormProps {
  submitLabel: string;
  submitPendingLabel: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  initialValues?: AdminUserFormValues;
  initialAvatarUrl?: string | null;
  requireAuthCode?: boolean;
  onSubmit: (values: AdminUserFormValues, avatarFile: File | null) => Promise<void>;
}

const defaultFormValues: AdminUserFormValues = {
  code: "",
  username: "",
  balance: 0,
  gameScore: 0,
  strength: 0,
  charisma: 0,
  endurance: 0,
  intelligence: 0,
};

function resolveAvatarUrl(avatarUrl: string): string {
  if (
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://") ||
    avatarUrl.startsWith("blob:")
  ) {
    return avatarUrl;
  }

  return `${env.NEXT_PUBLIC_API_BASE_URL}${avatarUrl}`;
}

export function AdminUserForm({
  submitLabel,
  submitPendingLabel,
  isSubmitting,
  errorMessage,
  initialValues,
  initialAvatarUrl,
  requireAuthCode = false,
  onSubmit,
}: AdminUserFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const form = useForm<AdminUserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialValues ?? defaultFormValues,
  });

  useEffect(() => {
    form.reset(initialValues ?? defaultFormValues);
  }, [form, initialValues]);

  const avatarPreviewUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );

  useEffect(() => {
    if (!avatarPreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const displayAvatarUrl = useMemo(() => {
    if (avatarPreviewUrl) {
      return avatarPreviewUrl;
    }

    return initialAvatarUrl ? resolveAvatarUrl(initialAvatarUrl) : null;
  }, [avatarPreviewUrl, initialAvatarUrl]);

  const submitForm = form.handleSubmit(async (values) => {
    if (requireAuthCode && values.code.length === 0) {
      form.setError("code", { message: "Код для входа обязателен" });
      return;
    }

    await onSubmit(values, avatarFile);
  });

  return (
    <form onSubmit={submitForm} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Avatar (optional)</label>

        <div className="relative h-28 w-28">
          <button
            type="button"
            className="group relative h-full w-full overflow-hidden rounded-full border border-dashed border-muted-foreground/40 bg-muted/20"
            onClick={() => fileInputRef.current?.click()}
          >
            {displayAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayAvatarUrl}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <CameraIcon className="size-7" />
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground">
                <CameraIcon className="size-4" />
                {displayAvatarUrl ? "Change" : "Select"}
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
            setAvatarFile(nextFile);
          }}
        />

        <p className="text-muted-foreground text-xs">Allowed: JPG, PNG, WEBP, GIF (up to 5MB).</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <Input id="username" placeholder="player_001" {...form.register("username")} />
        {form.formState.errors.username ? (
          <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="code" className="text-sm font-medium">
          Код для входа{requireAuthCode ? " *" : " (необязательно)"}
        </label>
        <Input
          id="code"
          inputMode="text"
          autoComplete="off"
          maxLength={6}
          placeholder="A1B2C3"
          className="font-mono uppercase"
          {...form.register("code", {
            onChange: (event) => {
              event.target.value = event.target.value.toUpperCase();
            },
          })}
        />
        <p className="text-muted-foreground text-xs">
          {requireAuthCode
            ? "Обязательный уникальный код из 6 латинских букв или цифр."
            : "Если оставить поле пустым, система сгенерирует код автоматически."}
        </p>
        {form.formState.errors.code ? (
          <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="balance" className="text-sm font-medium">
            Balance
          </label>
          <Input
            id="balance"
            type="number"
            min={0}
            {...form.register("balance", { valueAsNumber: true })}
          />
          {form.formState.errors.balance ? (
            <p className="text-xs text-destructive">{form.formState.errors.balance.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="gameScore" className="text-sm font-medium">
            Game Score
          </label>
          <Input
            id="gameScore"
            type="number"
            min={0}
            {...form.register("gameScore", { valueAsNumber: true })}
          />
          {form.formState.errors.gameScore ? (
            <p className="text-xs text-destructive">{form.formState.errors.gameScore.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="strength" className="text-sm font-medium">
            Strength
          </label>
          <Input
            id="strength"
            type="number"
            min={0}
            {...form.register("strength", { valueAsNumber: true })}
          />
          {form.formState.errors.strength ? (
            <p className="text-xs text-destructive">{form.formState.errors.strength.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="charisma" className="text-sm font-medium">
            Charisma
          </label>
          <Input
            id="charisma"
            type="number"
            min={0}
            {...form.register("charisma", { valueAsNumber: true })}
          />
          {form.formState.errors.charisma ? (
            <p className="text-xs text-destructive">{form.formState.errors.charisma.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="endurance" className="text-sm font-medium">
            Endurance
          </label>
          <Input
            id="endurance"
            type="number"
            min={0}
            {...form.register("endurance", { valueAsNumber: true })}
          />
          {form.formState.errors.endurance ? (
            <p className="text-xs text-destructive">{form.formState.errors.endurance.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="intelligence" className="text-sm font-medium">
            Intelligence
          </label>
          <Input
            id="intelligence"
            type="number"
            min={0}
            {...form.register("intelligence", { valueAsNumber: true })}
          />
          {form.formState.errors.intelligence ? (
            <p className="text-xs text-destructive">{form.formState.errors.intelligence.message}</p>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? submitPendingLabel : submitLabel}
      </Button>
    </form>
  );
}
