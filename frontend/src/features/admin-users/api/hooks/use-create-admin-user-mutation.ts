"use client";

import { useMutation } from "@tanstack/react-query";

import { createAdminUser } from "../requests/create-admin-user";

export function useCreateAdminUserMutation() {
  return useMutation({
    mutationFn: createAdminUser,
  });
}
