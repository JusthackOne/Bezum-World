import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { adminTasksEndpoints } from "../endpoints";
import type { AdminTasksListResponse, GetAdminTasksInput } from "../../model/admin-task.types";

export async function getAdminTasks(
  input: GetAdminTasksInput = {},
): Promise<AdminTasksListResponse> {
  return requestApiData(
    () =>
      adminHttpClient.get<ApiSuccessResponse<AdminTasksListResponse>>(
        adminTasksEndpoints.list,
        {
          params: {
            ...(input.search ? { search: input.search } : {}),
            ...(input.type ? { type: input.type } : {}),
            ...(input.page !== undefined ? { page: input.page } : {}),
            ...(input.limit !== undefined ? { limit: input.limit } : {}),
          },
        },
      ),
    "Failed to load tasks",
  );
}
