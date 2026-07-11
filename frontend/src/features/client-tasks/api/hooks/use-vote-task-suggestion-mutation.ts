"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { voteTaskSuggestion } from "../requests/vote-task-suggestion";

export function useVoteTaskSuggestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: voteTaskSuggestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskSuggestionsToday });
    },
  });
}
