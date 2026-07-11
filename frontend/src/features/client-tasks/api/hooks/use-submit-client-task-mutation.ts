"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { submitClientTask } from "../requests/submit-client-task";

export function useSubmitClientTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitClientTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventsPrefix });
    },
  });
}
