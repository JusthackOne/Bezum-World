import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminUpdateUserInput, AdminUpdateUserResponse } from "../../model/admin-user.types";

function buildJsonPayload(payload: AdminUpdateUserInput): Record<string, unknown> {
  return {
    ...(payload.username !== undefined ? { username: payload.username } : {}),
    ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
    ...(payload.balance !== undefined ? { balance: payload.balance } : {}),
    ...(payload.strength !== undefined ? { strength: payload.strength } : {}),
    ...(payload.charisma !== undefined ? { charisma: payload.charisma } : {}),
    ...(payload.endurance !== undefined ? { endurance: payload.endurance } : {}),
    ...(payload.intelligence !== undefined ? { intelligence: payload.intelligence } : {}),
  };
}

function buildMultipartPayload(payload: AdminUpdateUserInput): FormData {
  const formData = new FormData();

  if (payload.username !== undefined) {
    formData.append("username", payload.username);
  }

  if (payload.avatarUrl !== undefined && payload.avatarUrl !== null) {
    formData.append("avatarUrl", payload.avatarUrl);
  }

  if (payload.balance !== undefined) {
    formData.append("balance", String(payload.balance));
  }

  if (payload.strength !== undefined) {
    formData.append("strength", String(payload.strength));
  }

  if (payload.charisma !== undefined) {
    formData.append("charisma", String(payload.charisma));
  }

  if (payload.endurance !== undefined) {
    formData.append("endurance", String(payload.endurance));
  }

  if (payload.intelligence !== undefined) {
    formData.append("intelligence", String(payload.intelligence));
  }

  if (payload.avatarFile instanceof File) {
    formData.append("avatar", payload.avatarFile, payload.avatarFile.name);
  }

  return formData;
}

export async function updateAdminUser(
  payload: AdminUpdateUserInput,
): Promise<AdminUpdateUserResponse> {
  const hasAvatarFile = payload.avatarFile instanceof File;
  const requestBody = hasAvatarFile ? buildMultipartPayload(payload) : buildJsonPayload(payload);

  return requestApiData(
    () =>
      adminHttpClient.patch<ApiSuccessResponse<AdminUpdateUserResponse>>(
        `/admin/users/${payload.userId}`,
        requestBody,
      ),
    "Failed to update user",
  );
}
