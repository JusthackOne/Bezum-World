"use client";

import { useMutation } from "@tanstack/react-query";

import { deleteAdminUser } from "../requests/delete-admin-user";

export function useDeleteAdminUserMutation() {
  return useMutation({
    mutationFn: deleteAdminUser,
  });
}
