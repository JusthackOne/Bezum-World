"use client";

import { useMutation } from "@tanstack/react-query";

import { updateAdminUser } from "../requests/update-admin-user";

export function useUpdateAdminUserMutation() {
  return useMutation({
    mutationFn: updateAdminUser,
  });
}
