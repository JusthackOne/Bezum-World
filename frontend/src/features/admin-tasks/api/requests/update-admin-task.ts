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

function buildMultipartPayload(payload: UpdateAdminTaskInput): FormData {
  const formData = new FormData();
  const rewardAttributes = normalizeRewardAttributes(payload);

  if (payload.type !== undefined) {
    formData.append("type", payload.type);
  }

  if (payload.title !== undefined) {
    formData.append("title", payload.title);
  }

  if (payload.description !== undefined) {
    formData.append("description", payload.description);
  }

  if (payload.rewardMoney !== undefined) {
    formData.append("rewardMoney", String(payload.rewardMoney));
  }

  if (payload.rewardGameScore !== undefined) {
    formData.append("rewardGameScore", String(payload.rewardGameScore));
  }

  if (rewardAttributes) {
    formData.append("rewardAttributes", JSON.stringify(rewardAttributes));
  }

  if (payload.requiresProofImage !== undefined) {
    formData.append("requiresProofImage", String(payload.requiresProofImage));
  }

  if (payload.submissionLimit !== undefined) {
    formData.append("submissionLimit", String(payload.submissionLimit));
  }

  if (payload.imageFile instanceof File) {
    formData.append("image", payload.imageFile, payload.imageFile.name);
  } else if (payload.image !== undefined) {
    formData.append("image", payload.image);
  }

  return formData;
}

export async function updateAdminTask(payload: UpdateAdminTaskInput): Promise<AdminTask> {
  const rewardAttributes = normalizeRewardAttributes(payload);
  const hasImageFile = payload.imageFile instanceof File;
  const requestBody = hasImageFile
    ? buildMultipartPayload(payload)
    : {
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
      };

  return requestApiData(
    () =>
      adminHttpClient.patch<ApiSuccessResponse<AdminTask>>(
        adminTasksEndpoints.byId(payload.taskId),
        requestBody,
      ),
    "Failed to update task",
  );
}
