"use client";

import { useMutation } from "@tanstack/react-query";

import { submitClientTask } from "../requests/submit-client-task";

export function useSubmitClientTaskMutation() {
  return useMutation({
    mutationFn: submitClientTask,
  });
}
