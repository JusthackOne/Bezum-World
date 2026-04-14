"use client";

import { useMutation } from "@tanstack/react-query";

import { updateAdminTask } from "../requests/update-admin-task";

export function useUpdateAdminTaskMutation() {
  return useMutation({
    mutationFn: updateAdminTask,
  });
}
