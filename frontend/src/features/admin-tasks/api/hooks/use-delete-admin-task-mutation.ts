"use client";

import { useMutation } from "@tanstack/react-query";

import { deleteAdminTask } from "../requests/delete-admin-task";

export function useDeleteAdminTaskMutation() {
  return useMutation({
    mutationFn: deleteAdminTask,
  });
}
