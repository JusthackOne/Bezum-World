import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { clientTasksEndpoints } from "../endpoints";
import type { TaskSuggestionsResponse } from "../../model/client-task.types";

export async function getTaskSuggestions(): Promise<TaskSuggestionsResponse> {
  return requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<TaskSuggestionsResponse>>(
        clientTasksEndpoints.todaySuggestions,
      ),
    "Failed to load task suggestions",
  );
}
