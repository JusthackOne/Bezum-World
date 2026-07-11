"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { createTaskSuggestion } from "../requests/create-task-suggestion";

export function useCreateTaskSuggestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTaskSuggestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskSuggestionsToday });
    },
  });
}
