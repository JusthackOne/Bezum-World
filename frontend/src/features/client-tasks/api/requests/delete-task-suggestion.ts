import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";
import type { DeleteTaskSuggestionResponse } from "../../model/client-task.types";
import { clientTasksEndpoints } from "../endpoints";

export async function deleteTaskSuggestion(suggestionId: string): Promise<DeleteTaskSuggestionResponse> {
  return requestApiData(
    () => clientHttpClient.delete<ApiSuccessResponse<DeleteTaskSuggestionResponse>>(
      clientTasksEndpoints.suggestion(suggestionId),
    ),
    "Failed to delete suggestion",
  );
}
