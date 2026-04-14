import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { clientTasksEndpoints } from "../endpoints";
import type { ClientTasksListResponse, GetClientTasksInput } from "../../model/client-task.types";

export async function getClientTasks(
  input: GetClientTasksInput = {},
): Promise<ClientTasksListResponse> {
  return requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<ClientTasksListResponse>>(clientTasksEndpoints.list, {
        params: {
          ...(input.search ? { search: input.search } : {}),
          ...(input.type ? { type: input.type } : {}),
        },
      }),
    "Failed to load tasks",
  );
}
