"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config/query-keys";
import { deleteTaskSuggestion } from "../requests/delete-task-suggestion";

export function useDeleteTaskSuggestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTaskSuggestion,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskSuggestionsToday }),
  });
}
