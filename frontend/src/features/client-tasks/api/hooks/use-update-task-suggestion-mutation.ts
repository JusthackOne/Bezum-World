"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config/query-keys";
import { updateTaskSuggestion } from "../requests/update-task-suggestion";

export function useUpdateTaskSuggestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTaskSuggestion,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.taskSuggestionsToday }),
  });
}
