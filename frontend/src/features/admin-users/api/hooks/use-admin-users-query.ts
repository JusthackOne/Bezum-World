"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getAdminUsers } from "../requests/get-admin-users";

export function useAdminUsersQuery(isSessionInitialized: boolean, hasAdminSession: boolean) {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: getAdminUsers,
    enabled: isSessionInitialized && hasAdminSession,
  });
}
