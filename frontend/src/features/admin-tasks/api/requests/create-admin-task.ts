import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { adminTasksEndpoints } from "../endpoints";
import type { AdminTask, CreateAdminTaskInput } from "../../model/admin-task.types";

function normalizeRewardAttributes(
  payload: CreateAdminTaskInput,
): CreateAdminTaskInput["rewardAttributes"] {
  if (!payload.rewardAttributes) {
    return undefined;
  }

  const normalized = {
    ...(payload.rewardAttributes.strength !== undefined
      ? { strength: payload.rewardAttributes.strength }
      : {}),
    ...(payload.rewardAttributes.intelligence !== undefined
      ? { intelligence: payload.rewardAttributes.intelligence }
      : {}),
    ...(payload.rewardAttributes.charisma !== undefined
      ? { charisma: payload.rewardAttributes.charisma }
      : {}),
    ...(payload.rewardAttributes.endurance !== undefined
      ? { endurance: payload.rewardAttributes.endurance }
      : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export async function createAdminTask(payload: CreateAdminTaskInput): Promise<AdminTask> {
  const rewardAttributes = normalizeRewardAttributes(payload);

  return requestApiData(
    () =>
      adminHttpClient.post<ApiSuccessResponse<AdminTask>>(adminTasksEndpoints.list, {
        type: payload.type,
        title: payload.title,
        ...(payload.description ? { description: payload.description } : {}),
        ...(payload.image ? { image: payload.image } : {}),
        rewardMoney: payload.rewardMoney,
        ...(payload.rewardGameScore !== undefined
          ? { rewardGameScore: payload.rewardGameScore }
          : {}),
        ...(rewardAttributes ? { rewardAttributes } : {}),
        requiresProofImage: payload.requiresProofImage,
        ...(payload.type === "daily" && payload.submissionLimit !== undefined
          ? { submissionLimit: payload.submissionLimit }
          : {}),
      }),
    "Failed to create task",
  );
}
