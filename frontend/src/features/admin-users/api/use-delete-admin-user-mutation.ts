"use client";

import { useMutation } from "@tanstack/react-query";

import { deleteAdminUser } from "./delete-admin-user";

export function useDeleteAdminUserMutation(accessToken: string | null) {
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!accessToken) {
        throw new Error("Admin session is missing");
      }

      return deleteAdminUser(accessToken, userId);
    },
  });
}
