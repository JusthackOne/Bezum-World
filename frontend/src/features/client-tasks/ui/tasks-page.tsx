"use client";

import { useQueryClient } from "@tanstack/react-query";
import { tz } from "@date-fns/tz";
import { differenceInMinutes, endOfDay } from "date-fns";
import {
  LightbulbIcon,
  PencilIcon,
  SearchIcon,
  ThumbsUpIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminTaskForm, type AdminTaskFormValues } from "@/features/admin-tasks/ui";
import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import {
  useClientTasksQuery,
  useCreateTaskSuggestionMutation,
  useDeleteTaskSuggestionMutation,
  useSubmitClientTaskMutation,
  useTaskSuggestionsQuery,
  useVoteTaskSuggestionMutation,
  useUpdateTaskSuggestionMutation,
} from "@/features/client-tasks/api";
import type {
  ClientTask,
  ClientTaskTypeFilter,
  ClientTaskType,
  TaskSuggestion,
  ClientTaskRewardAttributes,
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
import { AvatarImage, NewBadge } from "@/shared/ui";

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

const taskTypeVisuals: Record<
  ClientTaskType,
  {
    labelClassName: string;
    cardClassName: string;
  }
> = {
  daily: {
    labelClassName: "border-sky-500 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-100",
    cardClassName:
      "border-sky-500/80 shadow-[0_0_0_1px_rgba(14,165,233,0.16),0_10px_28px_rgba(12,74,110,0.12)]",
  },
  weekly: {
    labelClassName:
      "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
    cardClassName:
      "border-emerald-500/80 shadow-[0_0_0_1px_rgba(16,185,129,0.16),0_10px_28px_rgba(6,95,70,0.12)]",
  },
  event: {
    labelClassName: "border-red-500 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-100",
    cardClassName:
      "border-red-500/80 shadow-[0_0_0_1px_rgba(239,68,68,0.2),0_10px_28px_rgba(127,29,29,0.16)]",
  },
};

function TaskTypeLabel({ type }: { type: ClientTaskType }) {
  return (
    <span
      className={[
        "inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        taskTypeVisuals[type].labelClassName,
      ].join(" ")}
    >
      {type}
    </span>
  );
}

interface TaskRewardSource {
  rewardMoney?: number | null;
  rewardGameScore?: number | null;
  rewardAttributes?: ClientTaskRewardAttributes | null;
}

function getTaskRewardVisuals(task: TaskRewardSource): RewardBadgeItem[] {
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

function getTimeUntilEndOfDay(now: Date, timeZone: string): string {
  const timeZoneContext = tz(timeZone);
  const remainingMinutes = differenceInMinutes(endOfDay(now, { in: timeZoneContext }), now, {
    roundingMethod: "ceil",
  });
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildRewardAttributes(
  values: AdminTaskFormValues,
): ClientTaskRewardAttributes | undefined {
  const rewardAttributes = {
    ...(values.rewardStrength !== undefined ? { strength: values.rewardStrength } : {}),
    ...(values.rewardIntelligence !== undefined ? { intelligence: values.rewardIntelligence } : {}),
    ...(values.rewardCharisma !== undefined ? { charisma: values.rewardCharisma } : {}),
    ...(values.rewardEndurance !== undefined ? { endurance: values.rewardEndurance } : {}),
  };

  return Object.keys(rewardAttributes).length > 0 ? rewardAttributes : undefined;
}

export function TasksPage() {
  const queryClient = useQueryClient();
  const session = useClientAuthStore((state) => state.session);
  const setSession = useClientAuthStore((state) => state.setSession);

  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientTaskTypeFilter>("all");
  const [selectedTask, setSelectedTask] = useState<ClientTask | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<TaskSuggestion | null>(null);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<TaskSuggestion | null>(null);
  const [pendingSuggestionDelete, setPendingSuggestionDelete] = useState<TaskSuggestion | null>(
    null,
  );
  const [proofTask, setProofTask] = useState<ClientTask | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofValidationMessage, setProofValidationMessage] = useState<string | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<PendingTaskCompletion | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [timeUntilEndOfDay, setTimeUntilEndOfDay] = useState("--:--");
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
  const suggestionsQuery = useTaskSuggestionsQuery();
  const submitTaskMutation = useSubmitClientTaskMutation();
  const createSuggestionMutation = useCreateTaskSuggestionMutation();
  const updateSuggestionMutation = useUpdateTaskSuggestionMutation();
  const deleteSuggestionMutation = useDeleteTaskSuggestionMutation();
  const voteSuggestionMutation = useVoteTaskSuggestionMutation();

  const tasks = useMemo(() => tasksQuery.data?.items ?? [], [tasksQuery.data?.items]);
  const suggestions = useMemo(
    () => suggestionsQuery.data?.items ?? [],
    [suggestionsQuery.data?.items],
  );
  const hasSuggestedToday = suggestionsQuery.data?.hasSuggestedToday ?? false;
  const isFiltered = search.length > 0 || typeFilter !== "all";
  const proofPreviewUrl = useMemo(
    () => (proofFile ? URL.createObjectURL(proofFile) : null),
    [proofFile],
  );

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const updateTimeUntilEndOfDay = () => {
      setTimeUntilEndOfDay(getTimeUntilEndOfDay(new Date(), timeZone));
    };

    updateTimeUntilEndOfDay();
    const intervalId = window.setInterval(updateTimeUntilEndOfDay, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!proofPreviewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(proofPreviewUrl);
    };
  }, [proofPreviewUrl]);

  useEffect(() => {
    if (!selectedSuggestion) {
      return;
    }

    const updatedSuggestion = suggestions.find(
      (suggestion) => suggestion.id === selectedSuggestion.id,
    );
    if (updatedSuggestion) {
      setSelectedSuggestion(updatedSuggestion);
    }
  }, [selectedSuggestion, suggestions]);

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

  async function voteForSuggestion(suggestion: TaskSuggestion) {
    if (!suggestion.canVote || voteSuggestionMutation.isPending) {
      return;
    }

    try {
      await voteSuggestionMutation.mutateAsync({
        suggestionId: suggestion.id,
      });
      showToast("Vote counted", "Your vote was added to this suggestion.");
    } catch (error: unknown) {
      showToast(
        "Vote failed",
        error instanceof Error ? error.message : "Unable to vote for this suggestion.",
        "destructive",
      );
    }
  }

  async function submitSuggestion(values: AdminTaskFormValues, imageFile: File | null) {
    const rewardAttributes = buildRewardAttributes(values);

    try {
      const taskPayload = {
        type: values.type as ClientTaskType,
        title: values.title.trim(),
        ...(values.description ? { description: values.description.trim() } : {}),
        ...(values.image ? { image: values.image.trim() } : {}),
        ...(imageFile ? { imageFile } : {}),
        rewardMoney: values.rewardMoney,
        ...(values.rewardGameScore !== undefined
          ? { rewardGameScore: values.rewardGameScore }
          : {}),
        ...(rewardAttributes ? { rewardAttributes } : {}),
        requiresProofImage: values.requiresProofImage,
        ...(values.type === "daily" && values.submissionLimit !== undefined
          ? { submissionLimit: values.submissionLimit }
          : {}),
      };
      if (editingSuggestion) {
        await updateSuggestionMutation.mutateAsync({
          suggestionId: editingSuggestion.id,
          ...taskPayload,
        });
      } else {
        await createSuggestionMutation.mutateAsync(taskPayload);
      }

      setSuggestionDialogOpen(false);
      setEditingSuggestion(null);
      showToast(
        editingSuggestion ? "Suggestion updated" : "Suggestion submitted",
        editingSuggestion
          ? "Your changes were saved and existing votes were preserved."
          : "Your task suggestion is available for community voting today.",
      );
    } catch (error: unknown) {
      showToast(
        "Suggestion failed",
        error instanceof Error ? error.message : "Unable to suggest task.",
        "destructive",
      );
      throw error;
    }
  }

  async function deleteSuggestion(suggestion: TaskSuggestion) {
    try {
      await deleteSuggestionMutation.mutateAsync(suggestion.id);
      setPendingSuggestionDelete(null);
      setSelectedSuggestion(null);
      showToast("Suggestion deleted", "You can submit another suggestion today.");
    } catch (error: unknown) {
      showToast(
        "Delete failed",
        error instanceof Error ? error.message : "Unable to delete suggestion.",
        "destructive",
      );
    }
  }

  function startEditingSuggestion(suggestion: TaskSuggestion) {
    setSelectedSuggestion(null);
    setEditingSuggestion(suggestion);
    setSuggestionDialogOpen(true);
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
      <section className="min-w-0 max-w-full overflow-x-hidden space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="text-muted-foreground text-sm">
              Complete tasks, claim rewards, and improve your hero.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              type="button"
              className="max-w-full whitespace-normal text-center"
              disabled={hasSuggestedToday || suggestionsQuery.isPending}
              onClick={() => setSuggestionDialogOpen(true)}
            >
              <LightbulbIcon className="size-4" />
              Suggest a New Task
            </Button>
            {hasSuggestedToday ? (
              <p className="text-muted-foreground max-w-72 text-xs sm:text-right">
                You have already suggested a task today.
              </p>
            ) : null}
          </div>
        </div>

        {suggestions.length > 0 ? (
          <section className="space-y-3">
            <div>
              <div>
                <h2 className="text-lg font-semibold">Today&apos;s Suggestions</h2>
                <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p>The highest-voted task becomes active after today ends.</p>
                  <p className="shrink-0 font-medium text-foreground">
                    Time remaining: <time className="tabular-nums">{timeUntilEndOfDay}</time>
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
              <div className="flex min-w-full gap-4 pb-2">
                {suggestions.map((suggestion) => {
                  const rewardVisuals = getTaskRewardVisuals(suggestion);
                  const imageUrl = getTaskImageUrl(suggestion.image);
                  const isVoting = voteSuggestionMutation.isPending;

                  return (
                    <article
                      key={suggestion.id}
                      className={[
                        "relative w-[calc(100vw-2rem)] max-w-[22rem] min-w-0 shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md sm:w-[21rem] md:w-[22rem]",
                        taskTypeVisuals[suggestion.type].cardClassName,
                      ].join(" ")}
                    >
                      <div className="pointer-events-none absolute top-3 left-3 z-20">
                        <TaskTypeLabel type={suggestion.type} />
                      </div>
                      <div className="pointer-events-none absolute top-3 right-3 z-20 flex max-w-[58%] items-center gap-2 rounded border border-foreground bg-card px-2 py-1 shadow-sm">
                        <AvatarImage
                          avatarUrl={suggestion.creator.avatarUrl}
                          alt={`${suggestion.creator.username} avatar`}
                          sizeClassName="size-7"
                        />
                        <div className="min-w-0 text-right">
                          <p className="text-muted-foreground text-[9px]">Suggested by</p>
                          <p className="truncate text-[10px] font-semibold">
                            {suggestion.creator.username}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setSelectedSuggestion(suggestion)}
                      >
                        <div className="h-44 w-full overflow-hidden bg-muted/30 sm:h-48">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt={suggestion.title}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="space-y-3 p-4">
                          <h3 className="line-clamp-2 text-sm font-semibold">{suggestion.title}</h3>
                          <RewardBadgesList rewards={rewardVisuals} emptyLabel="No rewards" />
                        </div>
                      </button>

                      <div className="border-t p-4">
                        {suggestion.canVote ? (
                          <Button
                            type="button"
                            className="h-10 w-full"
                            disabled={isVoting}
                            onClick={() => void voteForSuggestion(suggestion)}
                          >
                            <ThumbsUpIcon className="size-4" />
                            <span>{suggestion.voteCount}</span>
                            <span>Vote</span>
                          </Button>
                        ) : (
                          <div className="flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-muted/10 text-sm font-semibold">
                            <ThumbsUpIcon className="size-4" />
                            <span>{suggestion.voteCount}</span>
                          </div>
                        )}
                        {suggestion.isOwner ? (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => startEditingSuggestion(suggestion)}
                            >
                              <PencilIcon className="size-4" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => setPendingSuggestionDelete(suggestion)}
                            >
                              <Trash2Icon className="size-4" /> Delete
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <form
          className="min-w-0 max-w-full flex flex-col gap-2 sm:flex-row"
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
            className="whitespace-normal text-center"
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
              const isNewTask = isCreatedWithinLastDay(task.createdAt);

              return (
                <article
                  key={task.id}
                  className={[
                    "relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    taskTypeVisuals[task.type].cardClassName,
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
                    <div className="pointer-events-none absolute top-3 right-3 z-20">
                      <NewBadge />
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute top-3 left-3 z-20">
                    <TaskTypeLabel type={task.type} />
                  </div>
                  <div className="h-56 w-full overflow-hidden bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={task.title} className="h-full w-full object-cover" />
                  </div>

                  <div className="space-y-4 p-4">
                    <h2 className="line-clamp-2 text-base font-semibold">{task.title}</h2>

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
                  <TaskTypeLabel type={selectedTask.type} />
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
                    src={getTaskImageUrl(selectedTask.image)}
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
        open={suggestionDialogOpen}
        onOpenChange={(open) => {
          setSuggestionDialogOpen(open);
          if (!open) setEditingSuggestion(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-2xl">
          <div className="max-h-[85vh] min-w-0 space-y-4 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>
                {editingSuggestion ? "Edit Task Suggestion" : "Suggest a New Task"}
              </DialogTitle>
              <DialogDescription>
                Suggestions are limited to one per calendar day.
              </DialogDescription>
            </DialogHeader>

            {hasSuggestedToday && !editingSuggestion ? (
              <p className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                You have already suggested a task today.
              </p>
            ) : (
              <AdminTaskForm
                submitLabel={editingSuggestion ? "Save changes" : "Submit suggestion"}
                submitPendingLabel={editingSuggestion ? "Saving..." : "Submitting..."}
                isSubmitting={
                  createSuggestionMutation.isPending || updateSuggestionMutation.isPending
                }
                initialValues={
                  editingSuggestion
                    ? {
                        type: editingSuggestion.type,
                        title: editingSuggestion.title,
                        description: editingSuggestion.description ?? "",
                        image: editingSuggestion.image ?? "",
                        rewardMoney: editingSuggestion.rewardMoney,
                        rewardGameScore: editingSuggestion.rewardGameScore ?? undefined,
                        rewardStrength: editingSuggestion.rewardAttributes?.strength,
                        rewardIntelligence: editingSuggestion.rewardAttributes?.intelligence,
                        rewardCharisma: editingSuggestion.rewardAttributes?.charisma,
                        rewardEndurance: editingSuggestion.rewardAttributes?.endurance,
                        requiresProofImage: editingSuggestion.requiresProofImage,
                        submissionLimit: editingSuggestion.submissionLimit ?? undefined,
                      }
                    : undefined
                }
                errorMessage={
                  createSuggestionMutation.error instanceof Error
                    ? createSuggestionMutation.error.message
                    : null
                }
                onSubmit={submitSuggestion}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingSuggestionDelete !== null}
        onOpenChange={(open) => !open && setPendingSuggestionDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task suggestion? All of its votes will be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSuggestionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSuggestionMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingSuggestionDelete) void deleteSuggestion(pendingSuggestionDelete);
              }}
            >
              {deleteSuggestionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={selectedSuggestion !== null}
        onOpenChange={(open) => !open && setSelectedSuggestion(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedSuggestion ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <TaskTypeLabel type={selectedSuggestion.type} />
                  {selectedSuggestion.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedSuggestion.description ?? "No description available."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-md border bg-muted/10 px-3 py-2">
                  <AvatarImage
                    avatarUrl={selectedSuggestion.creator.avatarUrl}
                    alt={`${selectedSuggestion.creator.username} avatar`}
                    sizeClassName="size-9"
                  />
                  <div>
                    <p className="text-muted-foreground text-xs">Suggested by</p>
                    <p className="text-sm font-semibold">{selectedSuggestion.creator.username}</p>
                  </div>
                </div>

                <div className="h-56 overflow-hidden rounded-lg border bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getTaskImageUrl(selectedSuggestion.image)}
                    alt={selectedSuggestion.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border bg-muted/10 px-3 py-2">
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-semibold capitalize">{selectedSuggestion.type}</p>
                  </div>
                  <div className="rounded-md border bg-muted/10 px-3 py-2">
                    <p className="text-muted-foreground text-xs">Votes</p>
                    <p className="font-semibold">{selectedSuggestion.voteCount}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Rewards</p>
                  <RewardBadgesList
                    rewards={getTaskRewardVisuals(selectedSuggestion)}
                    emptyLabel="No rewards"
                  />
                </div>

                {selectedSuggestion.canVote ? (
                  <Button
                    type="button"
                    className="h-11 w-full"
                    disabled={voteSuggestionMutation.isPending}
                    onClick={() => void voteForSuggestion(selectedSuggestion)}
                  >
                    <ThumbsUpIcon className="size-4" />
                    <span>{selectedSuggestion.voteCount}</span>
                    <span>Vote</span>
                  </Button>
                ) : (
                  <div className="flex h-11 w-full items-center justify-center gap-2 rounded-md border bg-muted/10 text-sm font-semibold">
                    <ThumbsUpIcon className="size-4" />
                    <span>{selectedSuggestion.voteCount}</span>
                  </div>
                )}
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
