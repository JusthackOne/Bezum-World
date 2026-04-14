"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getAdminUsers } from "./get-admin-users";

export function useAdminUsersQuery(accessToken: string | null, isSessionInitialized: boolean) {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Admin session is missing");
      }

      return getAdminUsers(accessToken);
    },
    enabled: isSessionInitialized && Boolean(accessToken),
  });
}
