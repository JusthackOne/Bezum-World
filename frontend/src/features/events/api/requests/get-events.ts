import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { eventsEndpoints } from "../endpoints";
import type { EventFilter, EventsResponse } from "../../model/events.types";

export async function getEvents(filters: {
  type: EventFilter;
  page: number;
}): Promise<EventsResponse> {
  return requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<EventsResponse>>(eventsEndpoints.list, {
        params: filters,
      }),
    "Failed to load events",
  );
}
