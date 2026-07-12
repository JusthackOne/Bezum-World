import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";
import type { TaskSuggestion, UpdateTaskSuggestionInput } from "../../model/client-task.types";
import { clientTasksEndpoints } from "../endpoints";
import { buildTaskSuggestionRequestBody } from "./create-task-suggestion";

export async function updateTaskSuggestion(
  payload: UpdateTaskSuggestionInput,
): Promise<TaskSuggestion> {
  const { suggestionId, ...task } = payload;
  return requestApiData(
    () =>
      clientHttpClient.patch<ApiSuccessResponse<TaskSuggestion>>(
        clientTasksEndpoints.suggestion(suggestionId),
        buildTaskSuggestionRequestBody(task),
      ),
    "Failed to update suggestion",
  );
}
