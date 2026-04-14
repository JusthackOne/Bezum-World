"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getPublicUserItems } from "../requests/get-public-user-items";

export function usePublicUserItemsQuery(username: string) {
  return useQuery({
    queryKey: queryKeys.publicUserItems(username),
    queryFn: () => getPublicUserItems(username),
  });
}
