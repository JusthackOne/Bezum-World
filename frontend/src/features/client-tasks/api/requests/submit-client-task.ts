import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { clientTasksEndpoints } from "../endpoints";
import type { SubmitClientTaskInput, SubmitClientTaskResponse } from "../../model/client-task.types";

export async function submitClientTask(
  payload: SubmitClientTaskInput,
): Promise<SubmitClientTaskResponse> {
  return requestApiData(
    () =>
      clientHttpClient.post<ApiSuccessResponse<SubmitClientTaskResponse>>(
        clientTasksEndpoints.submit(payload.taskId),
        payload.proofImage ? { proofImage: payload.proofImage } : {},
      ),
    "Failed to complete task",
  );
}
