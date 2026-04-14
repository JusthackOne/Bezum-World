import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminCreateItemInput, AdminItem } from "../../model/admin-item.types";

export async function createAdminItem(payload: AdminCreateItemInput): Promise<AdminItem> {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("description", payload.description);
  formData.append("price", String(payload.price));
  formData.append("rarity", payload.rarity);
  formData.append("slotType", payload.slotType);

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

  return requestApiData(
    () => adminHttpClient.post<ApiSuccessResponse<AdminItem>>("/admin/items", formData),
    "Failed to create item",
  );
}
