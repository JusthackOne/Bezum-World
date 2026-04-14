"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import type { AdminTaskTypeFilter } from "../../model/admin-task.types";
import { getAdminTasks } from "../requests/get-admin-tasks";

interface UseAdminTasksQueryInput {
  search: string;
  type: AdminTaskTypeFilter;
  page: number;
  limit: number;
}

export function useAdminTasksQuery(
  isSessionInitialized: boolean,
  hasAdminSession: boolean,
  input: UseAdminTasksQueryInput,
) {
  return useQuery({
    queryKey: queryKeys.adminTasks(input),
    queryFn: () =>
      getAdminTasks({
        search: input.search || undefined,
        type: input.type === "all" ? undefined : input.type,
        page: input.page,
        limit: input.limit,
      }),
    enabled: isSessionInitialized && hasAdminSession,
  });
}
