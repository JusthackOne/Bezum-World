import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminCreateUserInput, AdminCreateUserResponse } from "../../model/admin-user.types";

export async function createAdminUser(
  payload: AdminCreateUserInput,
): Promise<AdminCreateUserResponse> {
  const formData = new FormData();
  formData.append("username", payload.username);
  formData.append("strength", String(payload.strength));
  formData.append("charisma", String(payload.charisma));
  formData.append("endurance", String(payload.endurance));
  formData.append("intelligence", String(payload.intelligence));

  if (payload.balance !== undefined) {
    formData.append("balance", String(payload.balance));
  }

  if (payload.avatarFile instanceof File) {
    formData.append("avatar", payload.avatarFile, payload.avatarFile.name);
  }

  return requestApiData(
    () => adminHttpClient.post<ApiSuccessResponse<AdminCreateUserResponse>>("/users", formData),
    "Failed to create user",
  );
}
