"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getClientTasks } from "../requests/get-client-tasks";
import type { ClientTaskTypeFilter } from "../../model/client-task.types";

interface UseClientTasksQueryOptions {
  search: string;
  type: ClientTaskTypeFilter;
}

export function useClientTasksQuery(options: UseClientTasksQueryOptions) {
  return useQuery({
    queryKey: queryKeys.clientTasks({
      search: options.search,
      type: options.type,
    }),
    queryFn: () =>
      getClientTasks({
        ...(options.search ? { search: options.search } : {}),
        ...(options.type !== "all" ? { type: options.type } : {}),
      }),
  });
}
