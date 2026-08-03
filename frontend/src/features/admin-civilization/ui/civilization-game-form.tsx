"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type FieldPath, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapIcon,
  SaveIcon,
  Settings2Icon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  CIVILIZATION_ATTRIBUTE_KEYS,
  type CivilizationAdminGame,
  type CivilizationAdminGameInput,
} from "@/entities/civilization";
import { useAdminUsersQuery } from "@/features/admin-users/api";
import { useAdminAuthStore } from "@/features/auth/model";
import { getApiRequestErrorDetails, getApiRequestErrorMessage } from "@/shared/lib/api-request";
import { cn } from "@/shared/lib/utils";
import { fromLocalDateTimeInput, toLocalDateTimeInput } from "@/shared/lib/date-time";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@/shared/ui/8bit";

import { useSaveAdminCivilizationGameMutation } from "../api";
import {
  civilizationGameFormSchema,
  createDefaultCivilizationGameInput,
  validateCivilizationMap,
} from "../model";
import { adminCivilizationRoutes } from "../routes";

const CivilizationMapEditor = dynamic(
  () => import("./civilization-map-editor").then((module) => module.CivilizationMapEditor),
  { ssr: false, loading: () => <Skeleton className="min-h-130 w-full" /> },
);

type FormValues = z.infer<typeof civilizationGameFormSchema>;

const stages = [
  { label: "Basics", Icon: Settings2Icon },
  { label: "Teams", Icon: UsersIcon },
  { label: "Map", Icon: MapIcon },
  { label: "Balance", Icon: ShieldIcon },
  { label: "Review", Icon: CheckCircle2Icon },
] as const;

function gameToInput(game: CivilizationAdminGame): FormValues {
  const defaultInput = createDefaultCivilizationGameInput();
  const teamA = game.teams.find((team) => team.side === "TEAM_A");
  const teamB = game.teams.find((team) => team.side === "TEAM_B");
  return {
    name: game.name,
    startAt: toLocalDateTimeInput(game.startAt),
    endAt: toLocalDateTimeInput(game.endAt),
    teams: [
      teamA
        ? {
            id: teamA.id,
            side: "TEAM_A",
            name: teamA.name,
            color: teamA.color,
            visualKey: teamA.visualKey,
            playerIds: teamA.playerIds,
          }
        : defaultInput.teams[0],
      teamB
        ? {
            id: teamB.id,
            side: "TEAM_B",
            name: teamB.name,
            color: teamB.color,
            visualKey: teamB.visualKey,
            playerIds: teamB.playerIds,
          }
        : defaultInput.teams[1],
    ],
    map: game.map,
    settings: game.settings,
  };
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("space-y-2 text-xs", className)}>
      <span className="block text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="block text-[9px] text-destructive">{error}</span> : null}
    </label>
  );
}

function NumberField({
  label,
  name,
  register,
  step = 1,
  min = 0,
}: {
  label: string;
  name: FieldPath<FormValues>;
  register: UseFormRegister<FormValues>;
  step?: number;
  min?: number;
}) {
  return (
    <Field label={label}>
      <Input type="number" min={min} step={step} {...register(name, { valueAsNumber: true })} />
    </Field>
  );
}

function DecimalField({
  label,
  name,
  register,
}: {
  label: string;
  name: FieldPath<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  return (
    <Field label={label}>
      <Input type="number" min={0} step="0.01" {...register(name)} />
    </Field>
  );
}

export function CivilizationGameForm({ game }: { game?: CivilizationAdminGame }) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const authInitialized = useAdminAuthStore((state) => state.isInitialized);
  const hasAdminSession = useAdminAuthStore((state) => Boolean(state.session));
  const usersQuery = useAdminUsersQuery(authInitialized, hasAdminSession);
  const saveMutation = useSaveAdminCivilizationGameMutation(game?.id);
  const isEditable =
    !game || game.status === "DRAFT" || game.status === "SCHEDULED" || game.status === "ACTIVE";
  const form = useForm<FormValues>({
    resolver: zodResolver(civilizationGameFormSchema),
    defaultValues: game ? gameToInput(game) : createDefaultCivilizationGameInput(),
    mode: "onBlur",
  });
  const teams = useWatch({ control: form.control, name: "teams" });
  const map = useWatch({ control: form.control, name: "map" });
  const settings = useWatch({ control: form.control, name: "settings" });
  const mapIssues = useMemo(
    () => validateCivilizationMap(map, teams, settings.tower.protectionRadius),
    [map, settings.tower.protectionRadius, teams],
  );
  const isDirty = form.formState.isDirty;
  const saveErrorDetails = getApiRequestErrorDetails(saveMutation.error);
  const users = useMemo(
    () =>
      (usersQuery.data ?? []).map((user) => ({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      })),
    [usersQuery.data],
  );

  useEffect(() => {
    if (!isEditable || !isDirty) return;
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () => window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, [isDirty, isEditable]);

  const togglePlayer = (teamIndex: 0 | 1, userId: string): void => {
    const ownPlayers = new Set(form.getValues(`teams.${teamIndex}.playerIds`));
    const otherIndex = teamIndex === 0 ? 1 : 0;
    const otherPlayers = new Set(form.getValues(`teams.${otherIndex}.playerIds`));
    if (ownPlayers.has(userId)) {
      ownPlayers.delete(userId);
    } else {
      ownPlayers.add(userId);
      otherPlayers.delete(userId);
    }
    form.setValue(`teams.${teamIndex}.playerIds`, [...ownPlayers], {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue(`teams.${otherIndex}.playerIds`, [...otherPlayers], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const submit = form.handleSubmit(
    async (values) => {
      if (mapIssues.some((issue) => issue.severity === "ERROR")) {
        setStage(2);
        toast.error("Resolve the map validation issues before saving.");
        return;
      }
      const input: CivilizationAdminGameInput = {
        ...values,
        startAt: fromLocalDateTimeInput(values.startAt),
        endAt: fromLocalDateTimeInput(values.endAt),
      };
      try {
        const saved = await saveMutation.mutateAsync(input);
        toast.success(game ? "Civilization game updated." : "Civilization draft created.");
        router.push(adminCivilizationRoutes.details(saved.id));
      } catch {
        // React Query retains the structured error for the form-level error panel.
      }
    },
    (errors) => {
      const errorStage =
        errors.name || errors.startAt || errors.endAt
          ? 0
          : errors.teams
            ? 1
            : errors.map
              ? 2
              : errors.settings
                ? 3
                : 4;
      setStage(errorStage);
      toast.error(`Resolve the validation errors in ${stages[errorStage].label}.`);
    },
  );

  return (
    <form className="space-y-5" onSubmit={submit}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {game ? `Edit ${game.name}` : "Create Civilization game"}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Configure teams, map snapshots and server-authoritative balance values.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isEditable && isDirty && !window.confirm("Discard unsaved Civilization changes?")) {
              return;
            }
            router.push(adminCivilizationRoutes.list);
          }}
        >
          Back to games
        </Button>
      </header>

      {game?.status === "ACTIVE" ? (
        <div className="border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-200">
          Saving applies the new settings and map to the running game immediately. Players on
          removed or impassable hexes are moved to their team spawn.
        </div>
      ) : !isEditable ? (
        <div className="border border-amber-400/50 bg-amber-500/10 p-3 text-xs text-amber-200">
          Completed and cancelled games are retained as immutable history.
        </div>
      ) : null}

      <nav aria-label="Civilization form stages" className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {stages.map(({ label, Icon }, index) => (
          <Button
            key={label}
            type="button"
            variant={stage === index ? "default" : "outline"}
            className="justify-start"
            onClick={() => setStage(index)}
          >
            <Icon className="size-4" /> {index + 1}. {label}
          </Button>
        ))}
      </nav>

      {stage === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Game window</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="Game name" error={form.formState.errors.name?.message}>
              <Input disabled={!isEditable} {...form.register("name")} />
            </Field>
            <Field label="Start date and time" error={form.formState.errors.startAt?.message}>
              <Input type="datetime-local" disabled={!isEditable} {...form.register("startAt")} />
            </Field>
            <Field label="End date and time" error={form.formState.errors.endAt?.message}>
              <Input type="datetime-local" disabled={!isEditable} {...form.register("endAt")} />
            </Field>
            <div className="border bg-muted/20 p-4 text-[10px] text-muted-foreground md:col-span-3">
              The backend rejects date ranges that overlap another scheduled or active game. A saved
              draft must pass server validation before it can be scheduled.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stage === 1 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {([0, 1] as const).map((teamIndex) => {
            const team = teams[teamIndex];
            return (
              <Card key={team.side}>
                <div className="h-1.5" style={{ backgroundColor: team.color }} />
                <CardHeader>
                  <CardTitle>{teamIndex === 0 ? "Team A" : "Team B"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Name"
                      error={form.formState.errors.teams?.[teamIndex]?.name?.message}
                    >
                      <Input disabled={!isEditable} {...form.register(`teams.${teamIndex}.name`)} />
                    </Field>
                    <Field
                      label="Color"
                      error={form.formState.errors.teams?.[teamIndex]?.color?.message}
                    >
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-14 p-1"
                          disabled={!isEditable}
                          {...form.register(`teams.${teamIndex}.color`)}
                        />
                        <Input
                          disabled={!isEditable}
                          {...form.register(`teams.${teamIndex}.color`)}
                        />
                      </div>
                    </Field>
                    <Field label="Visual identifier" className="sm:col-span-2">
                      <Input
                        disabled={!isEditable}
                        {...form.register(`teams.${teamIndex}.visualKey`)}
                      />
                    </Field>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Assigned players</p>
                    {usersQuery.isPending ? (
                      <Skeleton className="h-40 w-full" />
                    ) : usersQuery.isError ? (
                      <p className="text-xs text-destructive">{usersQuery.error.message}</p>
                    ) : users.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No users are available.</p>
                    ) : (
                      <div className="max-h-64 space-y-1 overflow-y-auto border p-2">
                        {users.map((user) => {
                          const checked = team.playerIds.includes(user.id);
                          const otherTeam = teams[teamIndex === 0 ? 1 : 0];
                          return (
                            <label
                              key={user.id}
                              className="flex cursor-pointer items-center justify-between gap-3 border p-2 text-[10px] hover:bg-muted/30"
                            >
                              <span className="truncate">{user.username}</span>
                              <span className="flex items-center gap-2">
                                {otherTeam.playerIds.includes(user.id) ? (
                                  <span className="text-[8px] text-muted-foreground">
                                    move from other team
                                  </span>
                                ) : null}
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!isEditable}
                                  onChange={() => togglePlayer(teamIndex, user.id)}
                                />
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {stage === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Visual hex-map editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CivilizationMapEditor
              value={map}
              teams={teams}
              settings={settings}
              issues={mapIssues}
              disabled={!isEditable}
              onChange={(nextMap) =>
                form.setValue("map", nextMap, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {mapIssues.length > 0 ? (
              <ul className="grid gap-2 md:grid-cols-2">
                {mapIssues.map((issue, index) => (
                  <li
                    key={`${issue.code}:${index}`}
                    className="border border-destructive/40 bg-destructive/10 p-3 text-[10px] text-destructive"
                  >
                    <span className="font-semibold">{issue.code}</span>: {issue.message}
                    {issue.coordinate ? ` (${issue.coordinate.q}, ${issue.coordinate.r})` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {stage === 3 ? (
        <fieldset className="space-y-4" disabled={!isEditable}>
          <Card>
            <CardHeader>
              <CardTitle>Action points and movement</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Maximum AP units (2 = 1 AP)"
                name="settings.actionPoints.maximumUnits"
                register={form.register}
              />
              <NumberField
                label="Initial AP units"
                name="settings.actionPoints.initialUnits"
                register={form.register}
              />
              <NumberField
                label="Regenerated units"
                name="settings.actionPoints.regenerationUnits"
                register={form.register}
              />
              <NumberField
                label="Regeneration interval (minutes)"
                name="settings.actionPoints.regenerationIntervalMinutes"
                register={form.register}
              />
              <NumberField
                label="Move owned cost (units)"
                name="settings.costs.ownedMoveUnits"
                register={form.register}
              />
              <NumberField
                label="Move other cost (units)"
                name="settings.costs.otherMoveUnits"
                register={form.register}
              />
              <NumberField
                label="Attack player cost (units)"
                name="settings.costs.attackPlayerUnits"
                register={form.register}
              />
              <NumberField
                label="Building contribution cost (units)"
                name="settings.costs.buildingCaptureUnits"
                register={form.register}
              />
              <NumberField
                label="Tower build cost (units)"
                name="settings.costs.towerBuildUnits"
                register={form.register}
              />
              <NumberField
                label="Tower attack cost (units)"
                name="settings.costs.towerAttackUnits"
                register={form.register}
              />
              <NumberField
                label="Town hall capture cost (units)"
                name="settings.costs.townHallCaptureUnits"
                register={form.register}
              />
              <NumberField
                label="Repair Kit cost (units)"
                name="settings.costs.towerRepairUnits"
                register={form.register}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Catapult</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" {...form.register("settings.catapult.enabled")} />
                Enabled for this game
              </label>
              <DecimalField
                label="Gold price"
                name="settings.catapult.goldPrice"
                register={form.register}
              />
              <NumberField
                label="Action cost (units)"
                name="settings.catapult.actionPointUnits"
                register={form.register}
              />
              <NumberField
                label="Tower actions / Town Hall damage points"
                name="settings.catapult.damage"
                register={form.register}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repair Kit</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" {...form.register("settings.repairKit.enabled")} />
                Enabled for this game
              </label>
              <DecimalField
                label="Gold price"
                name="settings.repairKit.goldPrice"
                register={form.register}
              />
              <NumberField
                label="Tower actions / Town Hall points repaired"
                name="settings.repairKit.repairActions"
                register={form.register}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Income and capture</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DecimalField
                label="Ordinary cell gold / hour"
                name="settings.territoryGoldPerHour"
                register={form.register}
              />
              <DecimalField
                label="Gold building / hour"
                name="settings.goldBuildingIncomePerHour"
                register={form.register}
              />
              {CIVILIZATION_ATTRIBUTE_KEYS.map((attribute) => (
                <DecimalField
                  key={attribute}
                  label={`${attribute} building / hour`}
                  name={`settings.attributeBuildingIncomePerHour.${attribute}`}
                  register={form.register}
                />
              ))}
              <NumberField
                label="Building capture required (half-units)"
                name="settings.buildingCapture.requiredUnits"
                register={form.register}
              />
              <NumberField
                label="Units per contribution"
                name="settings.buildingCapture.contributionUnits"
                register={form.register}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Combat and towers</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Attacker win %"
                name="settings.combat.attackerWinPercent"
                register={form.register}
              />
              <NumberField
                label="Defender win %"
                name="settings.combat.defenderWinPercent"
                register={form.register}
              />
              <DecimalField
                label="Tower build gold"
                name="settings.tower.buildGoldCost"
                register={form.register}
              />
              <NumberField
                label="Tower build minutes"
                name="settings.tower.constructionMinutes"
                register={form.register}
              />
              <NumberField
                label="Protection radius"
                name="settings.tower.protectionRadius"
                register={form.register}
              />
              <NumberField
                label="Tower destruction actions"
                name="settings.tower.destructionRequiredActions"
                register={form.register}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Town hall and score</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Town hall capture required (half-units)"
                name="settings.townHall.captureRequiredUnits"
                register={form.register}
              />
              <NumberField
                label="Capture units / action"
                name="settings.townHall.contributionUnits"
                register={form.register}
              />
              <DecimalField
                label="Gold score weight"
                name="settings.scoreWeights.gold"
                register={form.register}
              />
              {CIVILIZATION_ATTRIBUTE_KEYS.map((attribute) => (
                <DecimalField
                  key={attribute}
                  label={`${attribute} score weight`}
                  name={`settings.scoreWeights.${attribute}`}
                  register={form.register}
                />
              ))}
              <DecimalField
                label="Winner bonus"
                name="settings.winnerBonus"
                register={form.register}
              />
            </CardContent>
          </Card>
          {form.formState.errors.settings ? (
            <p className="text-xs text-destructive">
              One or more balance values are invalid. Review highlighted fields and ensure combat
              probabilities total 100%.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {stage === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuration review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-xs">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border p-3">
                <p className="text-muted-foreground">Teams</p>
                <p className="mt-2">
                  {teams[0].name} vs {teams[1].name}
                </p>
              </div>
              <div className="border p-3">
                <p className="text-muted-foreground">Players</p>
                <p className="mt-2">{teams[0].playerIds.length + teams[1].playerIds.length}</p>
              </div>
              <div className="border p-3">
                <p className="text-muted-foreground">Playable hexes</p>
                <p className="mt-2">{map.tiles.length}</p>
              </div>
              <div className="border p-3">
                <p className="text-muted-foreground">Map validation</p>
                <p
                  className={cn("mt-2", mapIssues.length ? "text-destructive" : "text-emerald-400")}
                >
                  {mapIssues.length ? `${mapIssues.length} issues` : "Passed"}
                </p>
              </div>
            </div>
            <div className="border bg-muted/20 p-4 text-[10px] text-muted-foreground">
              Saving updates the current game configuration. Active changes apply immediately; draft
              scheduling remains a separate confirmed operation with full backend validation.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {saveMutation.isError ? (
        <div className="border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          <p>{getApiRequestErrorMessage(saveMutation.error)}</p>
          {saveErrorDetails.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {saveErrorDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <footer className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          disabled={stage === 0}
          onClick={() => setStage((current) => current - 1)}
        >
          <ChevronLeftIcon className="size-4" /> Previous
        </Button>
        <div className="flex gap-2">
          {stage < stages.length - 1 ? (
            <Button type="button" onClick={() => setStage((current) => current + 1)}>
              Next <ChevronRightIcon className="size-4" />
            </Button>
          ) : null}
          <Button type="submit" disabled={!isEditable || saveMutation.isPending}>
            <SaveIcon className="size-4" />
            {saveMutation.isPending ? "Saving..." : game ? "Save changes" : "Create draft"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
