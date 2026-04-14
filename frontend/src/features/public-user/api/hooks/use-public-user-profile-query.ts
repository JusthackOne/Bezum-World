"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getPublicUserProfile } from "../requests/get-public-user-profile";

export function usePublicUserProfileQuery(username: string) {
  return useQuery({
    queryKey: queryKeys.publicUserProfile(username),
    queryFn: () => getPublicUserProfile(username),
  });
}
