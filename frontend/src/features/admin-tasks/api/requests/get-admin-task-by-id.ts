import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { adminTasksEndpoints } from "../endpoints";
import type { AdminTask } from "../../model/admin-task.types";

export async function getAdminTaskById(taskId: string): Promise<AdminTask> {
  return requestApiData(
    () => adminHttpClient.get<ApiSuccessResponse<AdminTask>>(adminTasksEndpoints.byId(taskId)),
    "Failed to load task",
  );
}
