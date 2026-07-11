import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { clientTasksEndpoints } from "../endpoints";
import type {
  CreateTaskSuggestionInput,
  TaskSuggestion,
} from "../../model/client-task.types";

function normalizeRewardAttributes(
  payload: CreateTaskSuggestionInput,
): CreateTaskSuggestionInput["rewardAttributes"] {
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

function buildMultipartPayload(payload: CreateTaskSuggestionInput): FormData {
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

export async function createTaskSuggestion(
  payload: CreateTaskSuggestionInput,
): Promise<TaskSuggestion> {
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
      clientHttpClient.post<ApiSuccessResponse<TaskSuggestion>>(
        clientTasksEndpoints.suggestions,
        requestBody,
      ),
    "Failed to suggest task",
  );
}
