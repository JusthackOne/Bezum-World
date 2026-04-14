"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import type { AdminItemLocationFilter } from "../../model/admin-item.types";
import { getAdminItems } from "../requests/get-admin-items";

export function useAdminItemsQuery(
  isSessionInitialized: boolean,
  hasAdminSession: boolean,
  location: AdminItemLocationFilter,
) {
  return useQuery({
    queryKey: queryKeys.adminItems(location),
    queryFn: () => getAdminItems({ location: location === "all" ? undefined : location }),
    enabled: isSessionInitialized && hasAdminSession,
  });
}
