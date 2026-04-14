"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  useAdminTaskByIdQuery,
  useDeleteAdminTaskMutation,
  useUpdateAdminTaskMutation,
} from "@/features/admin-tasks/api";
import type {
  AdminTask,
  AdminTaskRewardAttributes,
  UpdateAdminTaskInput,
} from "@/features/admin-tasks/model/admin-task.types";
import { queryKeys } from "@/shared/config/query-keys";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { AdminTaskForm, type AdminTaskFormValues } from "./admin-task-form";

interface AdminTaskEditFormProps {
  taskId: string;
}

function toFormValues(task: AdminTask): AdminTaskFormValues {
  return {
    type: task.type,
    title: task.title,
    description: task.description ?? "",
    image: task.image ?? "",
    rewardMoney: task.rewardMoney,
    rewardGameScore: task.rewardGameScore ?? undefined,
    rewardStrength: task.rewardAttributes?.strength,
    rewardIntelligence: task.rewardAttributes?.intelligence,
    rewardCharisma: task.rewardAttributes?.charisma,
    rewardEndurance: task.rewardAttributes?.endurance,
    requiresProofImage: task.requiresProofImage,
    submissionLimit: task.type === "daily" ? (task.submissionLimit ?? undefined) : undefined,
  };
}

function buildRewardAttributes(values: AdminTaskFormValues): AdminTaskRewardAttributes | undefined {
  const rewardAttributes = {
    ...(values.rewardStrength !== undefined ? { strength: values.rewardStrength } : {}),
    ...(values.rewardIntelligence !== undefined
      ? { intelligence: values.rewardIntelligence }
      : {}),
    ...(values.rewardCharisma !== undefined ? { charisma: values.rewardCharisma } : {}),
    ...(values.rewardEndurance !== undefined ? { endurance: values.rewardEndurance } : {}),
  };

  return Object.keys(rewardAttributes).length > 0 ? rewardAttributes : undefined;
}

export function AdminTaskEditForm({ taskId }: AdminTaskEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const taskQuery = useAdminTaskByIdQuery(true, true, taskId);
  const updateTaskMutation = useUpdateAdminTaskMutation();
  const deleteTaskMutation = useDeleteAdminTaskMutation();
  const [showSuccess, setShowSuccess] = useState(false);

  const initialFormValues = useMemo(
    () => (taskQuery.data ? toFormValues(taskQuery.data) : undefined),
    [taskQuery.data],
  );
  const mutationError =
    updateTaskMutation.error instanceof Error
      ? updateTaskMutation.error.message
      : "Unable to update task";

  if (taskQuery.isPending) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
          <CardDescription>Loading task data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (taskQuery.isError) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Failed to Load Task</CardTitle>
          <CardDescription>
            {taskQuery.error instanceof Error ? taskQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => taskQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!taskQuery.data) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Task Not Found</CardTitle>
          <CardDescription>Task with ID {taskId} does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/tasks")}>
            <ArrowLeftIcon className="size-4" />
            Back to tasks
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit Task</CardTitle>
        <CardDescription>Update task settings and rewards.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/tasks")}>
            <ArrowLeftIcon className="size-4" />
            Back to tasks
          </Button>
        </div>

        {showSuccess ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2Icon className="size-4" />
              Task updated successfully
            </div>
          </div>
        ) : null}

        <AdminTaskForm
          initialValues={initialFormValues}
          submitLabel="Save changes"
          submitPendingLabel="Saving..."
          isSubmitting={updateTaskMutation.isPending}
          errorMessage={updateTaskMutation.isError ? mutationError : null}
          onSubmit={async (values: AdminTaskFormValues, imageFile: File | null) => {
            setShowSuccess(false);
            const rewardAttributes = buildRewardAttributes(values);

            const payload: UpdateAdminTaskInput = {
              taskId,
              type: values.type,
              title: values.title.trim(),
              description: values.description.trim(),
              image: values.image.trim(),
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

            const updatedTask = await updateTaskMutation.mutateAsync(payload);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.adminTaskById(updatedTask.id),
              }),
            ]);
            setShowSuccess(true);
          }}
        />

        <div className="border-t pt-4">
          <Button
            type="button"
            variant="destructive"
            disabled={deleteTaskMutation.isPending}
            onClick={async () => {
              const shouldDelete = window.confirm("Delete this task? This action cannot be undone.");
              if (!shouldDelete) {
                return;
              }

              await deleteTaskMutation.mutateAsync(taskId);
              await queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] });
              router.push("/admin/tasks");
            }}
          >
            {deleteTaskMutation.isPending ? "Deleting..." : "Delete Task"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
