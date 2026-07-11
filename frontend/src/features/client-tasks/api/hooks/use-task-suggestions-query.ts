"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getTaskSuggestions } from "../requests/get-task-suggestions";

export function useTaskSuggestionsQuery() {
  return useQuery({
    queryKey: queryKeys.taskSuggestionsToday,
    queryFn: getTaskSuggestions,
  });
}
