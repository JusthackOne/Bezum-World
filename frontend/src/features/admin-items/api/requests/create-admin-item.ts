import { isAxiosError } from "axios";

import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import { adminHttpClient } from "@/shared/lib/admin-http-client";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminCreateItemInput, AdminItem } from "../../model/admin-item.types";

export async function createAdminItem(payload: AdminCreateItemInput): Promise<AdminItem> {
  try {
    const formData = new FormData();

    formData.append("name", payload.name);
    formData.append("description", payload.description);
    formData.append("price", String(payload.price));
    formData.append("rarity", payload.rarity);

    if (payload.image_url) {
      formData.append("image_url", payload.image_url);
    }

    if (payload.strength !== undefined) {
      formData.append("strength", String(payload.strength));
    }

    if (payload.charisma !== undefined) {
      formData.append("charisma", String(payload.charisma));
    }

    if (payload.agility !== undefined) {
      formData.append("agility", String(payload.agility));
    }

    if (payload.intelligence !== undefined) {
      formData.append("intelligence", String(payload.intelligence));
    }

    if (payload.durability !== undefined) {
      formData.append("durability", String(payload.durability));
    }

    if (payload.imageFile instanceof File) {
      formData.append("image", payload.imageFile, payload.imageFile.name);
    }

    const response = await adminHttpClient.post<ApiSuccessResponse<AdminItem>>("/admin/items", formData);

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Failed to create item"));
    }

    throw error;
  }
}
