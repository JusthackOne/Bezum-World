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

function buildMultipartPayload(payload: CreateAdminTaskInput): FormData {
  const formData = new FormData();
  const rewardAttributes = normalizeRewardAttributes(payload);

  formData.append("type", payload.type);
  formData.append("title", payload.title);
  formData.append("rewardMoney", String(payload.rewardMoney));
  formData.append("requiresProofImage", String(payload.requiresProofImage));

  if (payload.description) {
    formData.append("description", payload.description);
  }

  if (payload.rewardGameScore !== undefined) {
    formData.append("rewardGameScore", String(payload.rewardGameScore));
  }

  if (rewardAttributes) {
    formData.append("rewardAttributes", JSON.stringify(rewardAttributes));
  }

  if (payload.type === "daily" && payload.submissionLimit !== undefined) {
    formData.append("submissionLimit", String(payload.submissionLimit));
  }

  if (payload.imageFile instanceof File) {
    formData.append("image", payload.imageFile, payload.imageFile.name);
  } else if (payload.image) {
    formData.append("image", payload.image);
  }

  return formData;
}

export async function createAdminTask(payload: CreateAdminTaskInput): Promise<AdminTask> {
  const rewardAttributes = normalizeRewardAttributes(payload);
  const hasImageFile = payload.imageFile instanceof File;
  const requestBody = hasImageFile
    ? buildMultipartPayload(payload)
    : {
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
      };

  return requestApiData(
    () =>
      adminHttpClient.post<ApiSuccessResponse<AdminTask>>(adminTasksEndpoints.list, requestBody),
    "Failed to create task",
  );
}
