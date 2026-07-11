import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { clientTasksEndpoints } from "../endpoints";
import type {
  VoteTaskSuggestionInput,
  VoteTaskSuggestionResponse,
} from "../../model/client-task.types";

export async function voteTaskSuggestion(
  input: VoteTaskSuggestionInput,
): Promise<VoteTaskSuggestionResponse> {
  return requestApiData(
    () =>
      clientHttpClient.post<ApiSuccessResponse<VoteTaskSuggestionResponse>>(
        clientTasksEndpoints.voteSuggestion(input.suggestionId),
      ),
    "Failed to vote for task suggestion",
  );
}
