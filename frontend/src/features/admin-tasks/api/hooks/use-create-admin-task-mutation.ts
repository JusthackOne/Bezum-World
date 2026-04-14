"use client";

import { useMutation } from "@tanstack/react-query";

import { createAdminTask } from "../requests/create-admin-task";

export function useCreateAdminTaskMutation() {
  return useMutation({
    mutationFn: createAdminTask,
  });
}
