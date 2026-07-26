import type { SlotSpinResult, SlotsConfig } from "@/features/slots/model";
import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { slotsEndpoints } from "./endpoints";

export function getSlotsConfig(): Promise<SlotsConfig> {
  return requestApiData(
    () => clientHttpClient.get<ApiSuccessResponse<SlotsConfig>>(slotsEndpoints.config),
    "Unable to load the slot machine.",
  );
}

export function spinSlots(): Promise<SlotSpinResult> {
  return requestApiData(
    () => clientHttpClient.post<ApiSuccessResponse<SlotSpinResult>>(slotsEndpoints.spin),
    "Unable to complete the spin.",
  );
}
