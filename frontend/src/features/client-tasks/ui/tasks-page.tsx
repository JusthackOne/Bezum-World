"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SearchIcon, UploadIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { useClientTasksQuery, useSubmitClientTaskMutation } from "@/features/client-tasks/api";
import type {
  ClientTask,
  ClientTaskTypeFilter,
} from "@/features/client-tasks/model/client-task.types";
import { getTaskImageUrl } from "@/features/client-tasks/ui/compact-task-card";
import { queryKeys } from "@/shared/config/query-keys";
import { isCreatedWithinLastDay } from "@/shared/lib/newness";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/8bit/dialog";
import { RewardBadgesList, type RewardBadgeItem } from "@/shared/ui";
import { Input } from "@/shared/ui/8bit/input";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/shared/ui/8bit/toast";
import { NewBadge } from "@/shared/ui";

type ToastVariant = "default" | "destructive";

interface ToastState {
  key: number;
  open: boolean;
  title: string;
  description: string;
  rewards: RewardBadgeItem[];
  variant: ToastVariant;
}

interface PendingTaskCompletion {
  task: ClientTask;
  proofImageFile?: File;
}

const taskTypeFilterOptions: Array<{ label: string; value: ClientTaskTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Event", value: "event" },
];

function getTaskRewardVisuals(task: ClientTask): RewardBadgeItem[] {
  const rewards: RewardBadgeItem[] = [];

  if ((task.rewardMoney ?? 0) > 0) {
    rewards.push({
      kind: "balance",
      value: task.rewardMoney ?? 0,
    });
  }

  if ((task.rewardGameScore ?? 0) > 0) {
    rewards.push({
      kind: "gameScore",
      value: task.rewardGameScore ?? 0,
    });
  }

  if ((task.rewardAttributes?.strength ?? 0) > 0) {
    rewards.push({
      kind: "strength",
      value: task.rewardAttributes?.strength ?? 0,
    });
  }

  if ((task.rewardAttributes?.intelligence ?? 0) > 0) {
    rewards.push({
      kind: "intelligence",
      value: task.rewardAttributes?.intelligence ?? 0,
    });
  }

  if ((task.rewardAttributes?.charisma ?? 0) > 0) {
    rewards.push({
      kind: "charisma",
      value: task.rewardAttributes?.charisma ?? 0,
    });
  }

  if ((task.rewardAttributes?.endurance ?? 0) > 0) {
    rewards.push({
      kind: "endurance",
      value: task.rewardAttributes?.endurance ?? 0,
    });
  }

  return rewards;
}

export function TasksPage() {
  const queryClient = useQueryClient();
  const session = useClientAuthStore((state) => state.session);
  const setSession = useClientAuthStore((state) => state.setSession);

  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientTaskTypeFilter>("all");
  const [selectedTask, setSelectedTask] = useState<ClientTask | null>(null);
  const [proofTask, setProofTask] = useState<ClientTask | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofValidationMessage, setProofValidationMessage] = useState<string | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<PendingTaskCompletion | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>({
    key: 0,
    open: false,
    title: "",
    description: "",
    rewards: [],
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

  function showToast(
    title: string,
    description: string,
    variant: ToastVariant = "default",
    rewards: RewardBadgeItem[] = [],
  ) {
    setToastState((previousState) => ({
      key: previousState.key + 1,
      open: true,
      title,
      description,
      rewards,
      variant,
    }));
  }

  async function completeTask(task: ClientTask, proofImageFile?: File) {
    if (submittingTaskId) {
      return;
    }

    setSubmittingTaskId(task.id);

    try {
      const response = await submitTaskMutation.mutateAsync({
        taskId: task.id,
        ...(proofImageFile ? { proofImageFile } : {}),
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

      const rewardVisuals = getTaskRewardVisuals(task);
      showToast(
        "Task completed",
        rewardVisuals.length > 0 ? "Rewards received:" : "Task completed successfully.",
        "default",
        rewardVisuals,
      );
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
              const imageUrl = getTaskImageUrl(task.image);
              const isSubmitting = submittingTaskId === task.id;
              const isCompletedEventTask = task.type === "event" && !task.isAvailable;
              const actionDisabled = !task.isAvailable || isSubmitting;
              const isEventTask = task.type === "event";
              const isNewTask = isCreatedWithinLastDay(task.createdAt);

              return (
                <article
                  key={task.id}
                  className={[
                    "relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isEventTask
                      ? "border-red-500/80 shadow-[0_0_0_1px_rgba(239,68,68,0.2),0_10px_28px_rgba(127,29,29,0.16)]"
                      : "border-border",
                  ].join(" ")}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTask(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTask(task);
                    }
                  }}
                >
                  {isNewTask ? (
                    <div className="pointer-events-none absolute right-3 top-3 z-20">
                      <NewBadge />
                    </div>
                  ) : null}
                  <div className="h-56 w-full overflow-hidden bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={task.title} className="h-full w-full object-cover" />
                  </div>

                  <div className="space-y-4 p-4">
                    <h2 className="line-clamp-2 text-base font-semibold">
                      {isEventTask ? (
                        <span className="mr-2 inline-flex rounded border border-red-500/70 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                          Event
                        </span>
                      ) : null}
                      {task.title}
                    </h2>

                    <RewardBadgesList rewards={rewardVisuals} emptyLabel="No rewards" />

                    <Button
                      type="button"
                      className="h-11 w-full text-base font-semibold"
                      disabled={actionDisabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (task.requiresProofImage) {
                          setProofTask(task);
                          setProofFile(null);
                          setProofValidationMessage(null);
                          return;
                        }

                        setPendingCompletion({ task });
                      }}
                    >
                      {isSubmitting
                        ? "Completing..."
                        : isCompletedEventTask
                          ? "Event Completed"
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

      <Dialog open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedTask ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {selectedTask.type === "event" ? (
                    <span className="inline-flex rounded border border-red-500/70 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                      Event
                    </span>
                  ) : null}
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedTask.description ?? "No description available."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div
                  className={[
                    "h-56 overflow-hidden rounded-lg border bg-muted/30",
                    selectedTask.type === "event" ? "border-red-500/80" : "border-border",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      getTaskImageUrl(selectedTask.image)
                    }
                    alt={selectedTask.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border bg-muted/10 px-3 py-2">
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-semibold capitalize">{selectedTask.type}</p>
                  </div>
                  <div className="rounded-md border bg-muted/10 px-3 py-2">
                    <p className="text-muted-foreground text-xs">Status</p>
                    <p className="font-semibold">
                      {selectedTask.type === "event" && !selectedTask.isAvailable
                        ? "Completed"
                        : selectedTask.isAvailable
                          ? "Available"
                          : "Unavailable"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Rewards</p>
                  <RewardBadgesList
                    rewards={getTaskRewardVisuals(selectedTask)}
                    emptyLabel="No rewards"
                  />
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

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
            <DialogDescription>Upload proof image to complete this task.</DialogDescription>
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
                <img
                  src={proofPreviewUrl}
                  alt="Proof preview"
                  className="h-full w-full object-cover"
                />
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

                setPendingCompletion({ task: proofTask, proofImageFile: proofFile });
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

      <AlertDialog
        open={pendingCompletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCompletion(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm task completion</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCompletion
                ? `Complete "${pendingCompletion.task.title}"?`
                : "Complete this task?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(submittingTaskId)}>No</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(submittingTaskId)}
              onClick={() => {
                if (!pendingCompletion) {
                  return;
                }

                const completion = pendingCompletion;
                setPendingCompletion(null);
                void completeTask(completion.task, completion.proofImageFile);
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toast
        key={toastState.key}
        open={toastState.open}
        onOpenChange={(open) => setToastState((previousState) => ({ ...previousState, open }))}
        variant={toastState.variant}
      >
        <div className="grid gap-1">
          <ToastTitle>{toastState.title}</ToastTitle>
          <ToastDescription>{toastState.description}</ToastDescription>
          {toastState.rewards.length > 0 ? (
            <div className="mt-2">
              <RewardBadgesList rewards={toastState.rewards} />
            </div>
          ) : null}
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
