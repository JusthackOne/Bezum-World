import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { PublicUserEquipment } from "../../model/public-user.types";
import { publicUserApi } from "../endpoints";

export async function getUserEquipment(userId: string): Promise<PublicUserEquipment> {
  return requestApiData(
    () => clientHttpClient.get<ApiSuccessResponse<PublicUserEquipment>>(publicUserApi.equipment(userId)),
    "Failed to load user equipment",
  );
}
