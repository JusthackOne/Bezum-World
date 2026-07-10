import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { EquipItemResponse } from "../../model/public-user.types";
import { publicUserApi } from "../endpoints";

export async function unequipUserItem(itemId: string): Promise<EquipItemResponse> {
  return requestApiData(
    () =>
      clientHttpClient.delete<ApiSuccessResponse<EquipItemResponse>>(publicUserApi.equip(itemId)),
    "Failed to unequip item",
  );
}
