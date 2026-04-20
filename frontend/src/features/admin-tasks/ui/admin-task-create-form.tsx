"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCreateAdminTaskMutation } from "@/features/admin-tasks/api";
import type {
  AdminTaskRewardAttributes,
  CreateAdminTaskInput,
} from "@/features/admin-tasks/model/admin-task.types";
import { queryKeys } from "@/shared/config/query-keys";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { AdminTaskForm, type AdminTaskFormValues } from "./admin-task-form";

function buildRewardAttributes(values: AdminTaskFormValues): AdminTaskRewardAttributes | undefined {
  const rewardAttributes = {
    ...(values.rewardStrength !== undefined ? { strength: values.rewardStrength } : {}),
    ...(values.rewardIntelligence !== undefined ? { intelligence: values.rewardIntelligence } : {}),
    ...(values.rewardCharisma !== undefined ? { charisma: values.rewardCharisma } : {}),
    ...(values.rewardEndurance !== undefined ? { endurance: values.rewardEndurance } : {}),
  };

  return Object.keys(rewardAttributes).length > 0 ? rewardAttributes : undefined;
}

export function AdminTaskCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createTaskMutation = useCreateAdminTaskMutation();
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  const mutationError =
    createTaskMutation.error instanceof Error
      ? createTaskMutation.error.message
      : "Unable to create task";

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Create Task</CardTitle>
        <CardDescription>Create a new quest for users.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/tasks")}>
            <ArrowLeftIcon className="size-4" />
            Back to tasks
          </Button>
        </div>

        {createdTaskId ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2Icon className="size-4" />
              Task created successfully
            </div>
            <p className="mt-2 text-sm">
              Task ID: <span className="font-mono font-semibold">{createdTaskId}</span>
            </p>
          </div>
        ) : null}

        <AdminTaskForm
          submitLabel="Create task"
          submitPendingLabel="Creating..."
          isSubmitting={createTaskMutation.isPending}
          errorMessage={createTaskMutation.isError ? mutationError : null}
          onSubmit={async (values: AdminTaskFormValues, imageFile: File | null) => {
            const rewardAttributes = buildRewardAttributes(values);
            const payload: CreateAdminTaskInput = {
              type: values.type,
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

            const createdTask = await createTaskMutation.mutateAsync(payload);
            setCreatedTaskId(createdTask.id);

            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.adminTaskById(createdTask.id),
              }),
            ]);
          }}
        />
      </CardContent>
    </Card>
  );
}
