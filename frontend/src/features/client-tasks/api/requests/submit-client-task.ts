import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { clientTasksEndpoints } from "../endpoints";
import type {
  SubmitClientTaskInput,
  SubmitClientTaskResponse,
} from "../../model/client-task.types";

export async function submitClientTask(
  payload: SubmitClientTaskInput,
): Promise<SubmitClientTaskResponse> {
  const requestBody =
    payload.proofImageFile instanceof File
      ? (() => {
          const formData = new FormData();
          formData.append("proofImage", payload.proofImageFile, payload.proofImageFile.name);
          return formData;
        })()
      : payload.proofImage
        ? { proofImage: payload.proofImage }
        : {};

  return requestApiData(
    () =>
      clientHttpClient.post<ApiSuccessResponse<SubmitClientTaskResponse>>(
        clientTasksEndpoints.submit(payload.taskId),
        requestBody,
      ),
    "Failed to complete task",
  );
}
