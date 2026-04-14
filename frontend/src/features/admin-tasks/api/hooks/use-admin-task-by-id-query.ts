"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getAdminTaskById } from "../requests/get-admin-task-by-id";

export function useAdminTaskByIdQuery(
  isSessionInitialized: boolean,
  hasAdminSession: boolean,
  taskId: string,
) {
  return useQuery({
    queryKey: queryKeys.adminTaskById(taskId),
    queryFn: () => getAdminTaskById(taskId),
    enabled: isSessionInitialized && hasAdminSession,
  });
}
