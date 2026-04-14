import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { adminTasksEndpoints } from "../endpoints";
import type { AdminTask, UpdateAdminTaskInput } from "../../model/admin-task.types";

function normalizeRewardAttributes(
  payload: UpdateAdminTaskInput,
): UpdateAdminTaskInput["rewardAttributes"] {
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

export async function updateAdminTask(payload: UpdateAdminTaskInput): Promise<AdminTask> {
  const rewardAttributes = normalizeRewardAttributes(payload);

  return requestApiData(
    () =>
      adminHttpClient.patch<ApiSuccessResponse<AdminTask>>(
        adminTasksEndpoints.byId(payload.taskId),
        {
          ...(payload.type !== undefined ? { type: payload.type } : {}),
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.image !== undefined ? { image: payload.image } : {}),
          ...(payload.rewardMoney !== undefined ? { rewardMoney: payload.rewardMoney } : {}),
          ...(payload.rewardGameScore !== undefined
            ? { rewardGameScore: payload.rewardGameScore }
            : {}),
          ...(rewardAttributes !== undefined ? { rewardAttributes } : {}),
          ...(payload.requiresProofImage !== undefined
            ? { requiresProofImage: payload.requiresProofImage }
            : {}),
          ...(payload.submissionLimit !== undefined
            ? { submissionLimit: payload.submissionLimit }
            : {}),
        },
      ),
    "Failed to update task",
  );
}
