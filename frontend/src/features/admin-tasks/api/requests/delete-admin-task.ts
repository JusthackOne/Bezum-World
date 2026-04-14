import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { adminTasksEndpoints } from "../endpoints";
import type { AdminDeleteTaskResponse } from "../../model/admin-task.types";

export async function deleteAdminTask(taskId: string): Promise<AdminDeleteTaskResponse> {
  return requestApiData(
    () =>
      adminHttpClient.delete<ApiSuccessResponse<AdminDeleteTaskResponse>>(
        adminTasksEndpoints.byId(taskId),
      ),
    "Failed to delete task",
  );
}
