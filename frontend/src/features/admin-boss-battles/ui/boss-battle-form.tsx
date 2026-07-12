"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { uploadBossBattleImage, useFinishBossBattle, useSaveBossBattle } from "../api";
import type { BossBattle, BossBattleInput, BossReward } from "../model/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/shared/ui/8bit";
import { AdminImageUpload } from "@/shared/ui/admin-image-upload";
const attrs = z.object({
  strength: z.coerce.number().int().min(0),
  charisma: z.coerce.number().int().min(0),
  endurance: z.coerce.number().int().min(0),
  intelligence: z.coerce.number().int().min(0),
});
const item = z.object({
  enabled: z.boolean(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  slotType: z.enum(["HELMET", "ARMOR", "PANTS", "BOOTS", "LEFT_HAND", "RIGHT_HAND"]),
  rarity: z.enum(["unterlyanskiy", "basic_minimum", "sigma", "bezumnyy"]),
  durability: z.coerce.number().int().min(0),
  metadata: z.string(),
});
const reward = z.object({
  placeFrom: z.coerce.number().int().min(1),
  placeTo: z.coerce.number().int().min(1),
  gold: z.coerce.number().int().min(0),
  gameScore: z.coerce.number().int().min(0),
  attributes: attrs,
  item,
});
const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string(),
    imageUrl: z.string(),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    initialHp: z.coerce.number().int().positive(),
    attributes: attrs,
    attackCooldownSeconds: z.coerce.number().int().positive(),
    publish: z.boolean(),
    reason: z.string(),
    rewards: z.array(reward).min(3),
  })
  .superRefine((v, c) => {
    if (new Date(v.endsAt) <= new Date(v.startsAt))
      c.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End date must be after start date",
      });
    const ranges = [...v.rewards].sort((a, b) => a.placeFrom - b.placeFrom);
    if (![1, 2, 3].every((p) => ranges.some((r) => p >= r.placeFrom && p <= r.placeTo)))
      c.addIssue({
        code: "custom",
        path: ["rewards"],
        message: "Places 1, 2 and 3 must be covered",
      });
    ranges.forEach((r, i) => {
      if (r.placeTo < r.placeFrom)
        c.addIssue({
          code: "custom",
          path: ["rewards", i, "placeTo"],
          message: "Range end must be at least range start",
        });
      if (i && r.placeFrom <= ranges[i - 1]!.placeTo)
        c.addIssue({
          code: "custom",
          path: ["rewards"],
          message: "Reward ranges must not overlap",
        });
    });
  });
type InputValues = z.input<typeof schema>;
type Values = z.output<typeof schema>;
const toLocal = (v: string) => {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const emptyItem = {
  enabled: false,
  name: "",
  description: "",
  imageUrl: "",
  slotType: "HELMET" as const,
  rarity: "basic_minimum" as const,
  durability: 100,
  metadata: "",
};
const emptyAttrs = { strength: 0, charisma: 0, endurance: 0, intelligence: 0 };
const defaultRewards = [1, 2, 3].map((p) => ({
  placeFrom: p,
  placeTo: p,
  gold: 0,
  gameScore: 0,
  attributes: { ...emptyAttrs },
  item: { ...emptyItem },
}));
function defaults(b?: BossBattle): Values {
  return b
    ? {
        name: b.name,
        description: b.description ?? "",
        imageUrl: b.imageUrl ?? "",
        startsAt: toLocal(b.startsAt),
        endsAt: toLocal(b.endsAt),
        initialHp: b.initialHp,
        attributes: {
          strength: b.strength,
          charisma: b.charisma,
          endurance: b.endurance,
          intelligence: b.intelligence,
        },
        attackCooldownSeconds: b.attackCooldownSeconds,
        publish: false,
        reason: "",
        rewards: b.rewards.map((r) => ({
          placeFrom: r.placeFrom,
          placeTo: r.placeTo,
          gold: r.goldAmount ?? r.gold ?? 0,
          gameScore: r.gameScoreAmount ?? r.gameScore ?? 0,
          attributes: {
            strength: r.strength ?? r.attributes?.strength ?? 0,
            charisma: r.charisma ?? r.attributes?.charisma ?? 0,
            endurance: r.endurance ?? r.attributes?.endurance ?? 0,
            intelligence: r.intelligence ?? r.attributes?.intelligence ?? 0,
          },
          item:
            r.itemTemplate || r.item
              ? {
                  enabled: true,
                  name: (r.itemTemplate ?? r.item)!.name,
                  description: (r.itemTemplate ?? r.item)!.description ?? "",
                  imageUrl: (r.itemTemplate ?? r.item)!.imageUrl ?? "",
                  slotType: (r.itemTemplate ?? r.item)!.slotType,
                  rarity: (r.itemTemplate ?? r.item)!.rarity,
                  durability: (r.itemTemplate ?? r.item)!.durability ?? 100,
                  metadata: (r.itemTemplate ?? r.item)!.metadata
                    ? JSON.stringify((r.itemTemplate ?? r.item)!.metadata, null, 2)
                    : "",
                }
              : { ...emptyItem },
        })),
      }
    : {
        name: "",
        description: "",
        imageUrl: "",
        startsAt: "",
        endsAt: "",
        initialHp: 10000,
        attributes: { ...emptyAttrs },
        attackCooldownSeconds: 3600,
        publish: false,
        reason: "",
        rewards: defaultRewards,
      };
}
const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) => (
  <label className="space-y-2 text-sm font-medium">
    <span>{label}</span>
    {children}
    {error ? <span className="block text-xs text-destructive">{error}</span> : null}
  </label>
);
export function BossBattleForm({ battle }: { battle?: BossBattle }) {
  const router = useRouter();
  const save = useSaveBossBattle(battle?.id);
  const finish = useFinishBossBattle(battle?.id ?? "");
  const [bossImage, setBossImage] = useState<File | null>(null);
  const [itemImages, setItemImages] = useState<Record<number, File | null>>({});
  const form = useForm<InputValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults(battle),
  });
  const fields = useFieldArray({ control: form.control, name: "rewards" });
  const err = (path: keyof Values) => form.formState.errors[path]?.message as string | undefined;
  const submit = form.handleSubmit(async (v) => {
    try {
      const bossImageUrl = bossImage ? await uploadBossBattleImage(bossImage) : v.imageUrl;
      const itemImageUrls = await Promise.all(
        v.rewards.map(async (_, index) =>
          itemImages[index]
            ? uploadBossBattleImage(itemImages[index]!)
            : v.rewards[index]!.item.imageUrl,
        ),
      );
      const rewards: BossReward[] = v.rewards.map((r, index) => ({
        placeFrom: r.placeFrom,
        placeTo: r.placeTo,
        gold: r.gold,
        gameScore: r.gameScore,
        attributes: r.attributes,
        ...(r.item.enabled
          ? {
              item: {
                name: r.item.name,
                description: r.item.description || undefined,
                imageUrl: itemImageUrls[index] || undefined,
                slotType: r.item.slotType,
                rarity: r.item.rarity,
                durability: r.item.durability,
                metadata: r.item.metadata
                  ? (JSON.parse(r.item.metadata) as Record<string, unknown>)
                  : undefined,
              },
            }
          : {}),
      }));
      const payload: BossBattleInput = {
        name: v.name,
        description: v.description || undefined,
        imageUrl: bossImageUrl || undefined,
        startsAt: new Date(v.startsAt).toISOString(),
        endsAt: new Date(v.endsAt).toISOString(),
        initialHp: v.initialHp,
        attributes: v.attributes,
        attackCooldownSeconds: v.attackCooldownSeconds,
        rewards,
        ...(!battle ? { publish: v.publish } : {}),
        ...(battle && v.reason ? { reason: v.reason } : {}),
      };
      const saved = await save.mutateAsync(payload);
      toast.success(battle ? "Boss battle updated" : "Boss battle created");
      router.push(`/admin/boss-battles/${saved.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save boss battle");
    }
  });
  return (
    <form onSubmit={submit} className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/boss-battles")}>
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
        {battle && ["ACTIVE", "SCHEDULED"].includes(battle.status) ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                Finish
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finish this battle?</AlertDialogTitle>
                <AlertDialogDescription>
                  This stops the battle without granting rewards. This action requires confirmation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await finish.mutateAsync();
                    toast.success("Battle finished");
                  }}
                >
                  Finish battle
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{battle ? `Edit ${battle.name}` : "Create Boss Battle"}</CardTitle>
          <CardDescription>
            {battle
              ? `Status: ${battle.status} · HP: ${battle.currentHp} / ${battle.initialHp}`
              : "Configure a new boss encounter."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Boss name *" error={err("name")}>
            <Input {...form.register("name")} />
          </Field>
          <AdminImageUpload
            label="Boss image"
            value={form.getValues("imageUrl")}
            file={bossImage}
            onFileChange={setBossImage}
          />
          <Field label="Start date *" error={err("startsAt")}>
            <Input type="datetime-local" {...form.register("startsAt")} />
          </Field>
          <Field label="End date *" error={err("endsAt")}>
            <Input type="datetime-local" {...form.register("endsAt")} />
          </Field>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            <span>Description</span>
            <textarea
              className="min-h-24 w-full rounded-md border bg-transparent p-3"
              {...form.register("description")}
            />
          </label>
          {!battle ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" {...form.register("publish")} />
              Publish immediately or schedule by start date
            </label>
          ) : (
            <Field label="Audit reason">
              <Input {...form.register("reason")} />
            </Field>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>HP & Boss Attributes</CardTitle>
          <CardDescription>Current HP initially equals initial HP.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Initial HP *" error={err("initialHp")}>
            <Input type="number" {...form.register("initialHp")} />
          </Field>
          {(["strength", "charisma", "endurance", "intelligence"] as const).map((a) => (
            <Field key={a} label={a[0]!.toUpperCase() + a.slice(1)}>
              <Input type="number" min={0} {...form.register(`attributes.${a}`)} />
            </Field>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Battle Settings</CardTitle>
          <CardDescription>
            Damage uses the existing backend BATTLES formula. Formula limits and random multiplier
            are backend-controlled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Attack cooldown (seconds) *" error={err("attackCooldownSeconds")}>
            <Input
              className="max-w-xs"
              type="number"
              min={1}
              {...form.register("attackCooldownSeconds")}
            />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rewards</CardTitle>
              <CardDescription>
                Exact places and non-overlapping ranges are supported.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                fields.append({
                  placeFrom: 4,
                  placeTo: 10,
                  gold: 0,
                  gameScore: 0,
                  attributes: { ...emptyAttrs },
                  item: { ...emptyItem },
                })
              }
            >
              <PlusIcon className="size-4" />
              Add range
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.formState.errors.rewards?.message ? (
            <p className="text-sm text-destructive">{form.formState.errors.rewards.message}</p>
          ) : null}
          {fields.fields.map((f, i) => (
            <Card key={f.id}>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Field label="Place from">
                    <Input type="number" {...form.register(`rewards.${i}.placeFrom`)} />
                  </Field>
                  <Field label="Place to">
                    <Input type="number" {...form.register(`rewards.${i}.placeTo`)} />
                  </Field>
                  <Field label="Gold">
                    <Input type="number" {...form.register(`rewards.${i}.gold`)} />
                  </Field>
                  <Field label="Game Score">
                    <Input type="number" {...form.register(`rewards.${i}.gameScore`)} />
                  </Field>
                  <Button
                    type="button"
                    variant="destructive"
                    className="self-end"
                    onClick={() => fields.remove(i)}
                  >
                    <Trash2Icon className="size-4" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  {(["strength", "charisma", "endurance", "intelligence"] as const).map((a) => (
                    <Field key={a} label={`${a} bonus`}>
                      <Input type="number" {...form.register(`rewards.${i}.attributes.${a}`)} />
                    </Field>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" {...form.register(`rewards.${i}.item.enabled`)} />
                  Create a new reward item
                </label>
                {form.watch(`rewards.${i}.item.enabled`) ? (
                  <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
                    <Field label="Item name *">
                      <Input {...form.register(`rewards.${i}.item.name`)} />
                    </Field>
                    <AdminImageUpload
                      label="Reward item image"
                      value={form.getValues(`rewards.${i}.item.imageUrl`)}
                      file={itemImages[i] ?? null}
                      onFileChange={(file) =>
                        setItemImages((current) => ({ ...current, [i]: file }))
                      }
                    />
                    <Field label="Type">
                      <select
                        className="h-9 w-full rounded-md border bg-transparent px-3"
                        {...form.register(`rewards.${i}.item.slotType`)}
                      >
                        {["HELMET", "ARMOR", "PANTS", "BOOTS", "LEFT_HAND", "RIGHT_HAND"].map(
                          (x) => (
                            <option key={x}>{x}</option>
                          ),
                        )}
                      </select>
                    </Field>
                    <Field label="Rarity">
                      <select
                        className="h-9 w-full rounded-md border bg-transparent px-3"
                        {...form.register(`rewards.${i}.item.rarity`)}
                      >
                        {["unterlyanskiy", "basic_minimum", "sigma", "bezumnyy"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Durability">
                      <Input type="number" {...form.register(`rewards.${i}.item.durability`)} />
                    </Field>
                    <Field label="Metadata (JSON)">
                      <Input
                        placeholder='{"key":"value"}'
                        {...form.register(`rewards.${i}.item.metadata`)}
                      />
                    </Field>
                    <label className="space-y-2 text-sm font-medium sm:col-span-2">
                      <span>Item description</span>
                      <textarea
                        className="min-h-20 w-full rounded-md border bg-transparent p-3"
                        {...form.register(`rewards.${i}.item.description`)}
                      />
                    </label>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
      {save.isError ? <p className="text-sm text-destructive">{save.error.message}</p> : null}
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving..." : battle ? "Save changes" : "Create Boss Battle"}
      </Button>
    </form>
  );
}
