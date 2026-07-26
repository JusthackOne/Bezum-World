"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { refreshCurrentUserProfile } from "@/features/auth/api";
import { queryKeys } from "@/shared/config/query-keys";

import { submitClientTask } from "../requests/submit-client-task";

export function useSubmitClientTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitClientTask,
    onSuccess: async () => {
      await Promise.all([
        refreshCurrentUserProfile(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.eventsPrefix }),
      ]);
    },
  });
}
