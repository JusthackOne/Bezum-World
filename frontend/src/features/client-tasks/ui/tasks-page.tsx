"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BrainIcon,
  CoinsIcon,
  DumbbellIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { useClientTasksQuery, useSubmitClientTaskMutation } from "@/features/client-tasks/api";
import type { ClientTask, ClientTaskTypeFilter } from "@/features/client-tasks/model/client-task.types";
import { queryKeys } from "@/shared/config/query-keys";
import { resolveAssetUrl } from "@/shared/lib/item-display";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { GameScoreIcon } from "@/shared/ui/game-score-icon";
import { Input } from "@/shared/ui/input";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/shared/ui/toast";

type ToastVariant = "default" | "destructive";

interface ToastState {
  key: number;
  open: boolean;
  title: string;
  description: string;
  variant: ToastVariant;
}

interface RewardVisual {
  key: string;
  icon: ComponentType<{ className?: string }>;
  value: number;
}

const taskTypeFilterOptions: Array<{ label: string; value: ClientTaskTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Event", value: "event" },
];

const fallbackTaskImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'%3E%3Crect width='1200' height='800' fill='%23181e2b'/%3E%3Cpath d='M0 540 L260 360 L500 520 L760 300 L1200 560 L1200 800 L0 800 Z' fill='%23273245'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23d8dee9' font-size='58' font-family='Segoe UI, Arial, sans-serif'%3ETask%3C/text%3E%3C/svg%3E";

function getTaskRewardVisuals(task: ClientTask): RewardVisual[] {
  const rewards: RewardVisual[] = [];

  if ((task.rewardMoney ?? 0) > 0) {
    rewards.push({
      key: "money",
      icon: CoinsIcon,
      value: task.rewardMoney ?? 0,
    });
  }

  if ((task.rewardGameScore ?? 0) > 0) {
    rewards.push({
      key: "gameScore",
      icon: GameScoreIcon,
      value: task.rewardGameScore ?? 0,
    });
  }

  if ((task.rewardAttributes?.strength ?? 0) > 0) {
    rewards.push({
      key: "strength",
      icon: DumbbellIcon,
      value: task.rewardAttributes?.strength ?? 0,
    });
  }

  if ((task.rewardAttributes?.intelligence ?? 0) > 0) {
    rewards.push({
      key: "intelligence",
      icon: BrainIcon,
      value: task.rewardAttributes?.intelligence ?? 0,
    });
  }

  if ((task.rewardAttributes?.charisma ?? 0) > 0) {
    rewards.push({
      key: "charisma",
      icon: SparklesIcon,
      value: task.rewardAttributes?.charisma ?? 0,
    });
  }

  if ((task.rewardAttributes?.endurance ?? 0) > 0) {
    rewards.push({
      key: "endurance",
      icon: ShieldIcon,
      value: task.rewardAttributes?.endurance ?? 0,
    });
  }

  return rewards;
}

function buildCompletionMessage(task: ClientTask): string {
  const fragments = getTaskRewardVisuals(task).map((reward) => `+${reward.value}`);
  return fragments.length > 0 ? `Rewards: ${fragments.join(" ")}` : "Task completed successfully.";
}

export function TasksPage() {
  const queryClient = useQueryClient();
  const session = useClientAuthStore((state) => state.session);
  const setSession = useClientAuthStore((state) => state.setSession);

  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientTaskTypeFilter>("all");
  const [proofTask, setProofTask] = useState<ClientTask | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofValidationMessage, setProofValidationMessage] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>({
    key: 0,
    open: false,
    title: "",
    description: "",
    variant: "default",
  });

  const tasksQuery = useClientTasksQuery({
    search,
    type: typeFilter,
  });
  const submitTaskMutation = useSubmitClientTaskMutation();

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data?.items]);
  const isFiltered = search.length > 0 || typeFilter !== "all";
  const proofPreviewUrl = useMemo(
    () => (proofFile ? URL.createObjectURL(proofFile) : null),
    [proofFile],
  );

  useEffect(() => {
    if (!proofPreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(proofPreviewUrl);
    };
  }, [proofPreviewUrl]);

  function showToast(title: string, description: string, variant: ToastVariant = "default") {
    setToastState((previousState) => ({
      key: previousState.key + 1,
      open: true,
      title,
      description,
      variant,
    }));
  }

  async function completeTask(task: ClientTask, proofImage?: string) {
    if (submittingTaskId) {
      return;
    }

    setSubmittingTaskId(task.id);

    try {
      const response = await submitTaskMutation.mutateAsync({
        taskId: task.id,
        ...(proofImage ? { proofImage } : {}),
      });

      if (session) {
        setSession({
          ...session,
          user: {
            ...session.user,
            balance: response.user.balance,
            gameScore: response.user.gameScore,
            strength: response.user.strength,
            intelligence: response.user.intelligence,
            charisma: response.user.charisma,
            endurance: response.user.endurance,
          },
        });
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.clientTasksPrefix,
      });

      const username = session?.user.username?.trim();
      if (username) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.publicUserProfile(username),
        });
      }

      showToast("Task completed", buildCompletionMessage(task));
    } catch (error: unknown) {
      showToast(
        "Task completion failed",
        error instanceof Error ? error.message : "Unable to complete task.",
        "destructive",
      );
    } finally {
      setSubmittingTaskId(null);
    }
  }

  if (tasksQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Tasks</CardTitle>
          <CardDescription>
            {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => tasksQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ToastProvider duration={3500} swipeDirection="right">
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Complete tasks, claim rewards, and improve your hero.
          </p>
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(draftSearch.trim());
          }}
        >
          <div className="relative flex-1">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Search by title"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraftSearch("");
              setSearch("");
              setTypeFilter("all");
            }}
          >
            Reset Filters
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {taskTypeFilterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={typeFilter === option.value ? "default" : "outline"}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {tasksQuery.isPending ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-muted-foreground text-sm">Loading tasks...</p>
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-muted-foreground text-sm">
                {isFiltered
                  ? "No tasks match your current filters."
                  : "No tasks available right now."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => {
              const rewardVisuals = getTaskRewardVisuals(task);
              const imageUrl = task.image ? resolveAssetUrl(task.image) : fallbackTaskImage;
              const isSubmitting = submittingTaskId === task.id;
              const isLockedEventTask = task.type === "event" && !task.isAvailable;
              const actionDisabled = !task.isAvailable || isSubmitting;

              return (
                <article key={task.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <div className="h-56 w-full overflow-hidden bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={task.title} className="h-full w-full object-cover" />
                  </div>

                  <div className="space-y-4 p-4">
                    <h2 className="line-clamp-2 text-base font-semibold">{task.title}</h2>

                    <div className="flex flex-wrap gap-2">
                      {rewardVisuals.length > 0 ? (
                        rewardVisuals.map((reward) => {
                          const Icon = reward.icon;
                          return (
                            <span
                              key={reward.key}
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold"
                            >
                              <Icon className="size-4" />
                              {reward.value}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground text-sm">No rewards</span>
                      )}
                    </div>

                    <Button
                      type="button"
                      className="h-11 w-full text-base font-semibold"
                      disabled={actionDisabled}
                      onClick={() => {
                        if (task.requiresProofImage) {
                          setProofTask(task);
                          setProofFile(null);
                          setProofValidationMessage(null);
                          return;
                        }

                        void completeTask(task);
                      }}
                    >
                      {isSubmitting
                        ? "Completing..."
                        : isLockedEventTask
                          ? "Event Locked"
                          : !task.isAvailable
                            ? "Unavailable"
                            : "Complete Task"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={proofTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setProofTask(null);
            setProofFile(null);
            setProofValidationMessage(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach image</DialogTitle>
            <DialogDescription>
              Upload proof image to complete this task.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label
              htmlFor="proofImage"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-sm"
            >
              <UploadIcon className="size-5 text-muted-foreground" />
              <span>Select image</span>
            </label>
            <Input
              id="proofImage"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setProofFile(nextFile);
                setProofValidationMessage(null);
              }}
            />

            <div className="h-48 overflow-hidden rounded-lg border bg-muted/20">
              {proofPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proofPreviewUrl} alt="Proof preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Preview will appear here
                </div>
              )}
            </div>

            {proofValidationMessage ? (
              <p className="text-sm text-destructive">{proofValidationMessage}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProofTask(null);
                setProofFile(null);
                setProofValidationMessage(null);
              }}
              disabled={Boolean(submittingTaskId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={Boolean(submittingTaskId)}
              onClick={() => {
                if (!proofTask) {
                  return;
                }

                if (!proofFile) {
                  setProofValidationMessage("Please attach an image before submitting.");
                  return;
                }

                void completeTask(
                  proofTask,
                  `proof:${proofFile.name}:${proofFile.size}:${proofFile.lastModified}`,
                );
                setProofTask(null);
                setProofFile(null);
                setProofValidationMessage(null);
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast
        key={toastState.key}
        open={toastState.open}
        onOpenChange={(open) => setToastState((previousState) => ({ ...previousState, open }))}
        variant={toastState.variant}
      >
        <div className="grid gap-1">
          <ToastTitle>{toastState.title}</ToastTitle>
          <ToastDescription>{toastState.description}</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
