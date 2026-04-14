"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getUserProfileByUsername } from "../requests/get-user-profile-by-username";

export function useUserProfileByUsernameQuery(username: string | null, enabled: boolean) {
  return useQuery({
    queryKey: username ? queryKeys.userProfile(username) : ["users", "profile", "unknown"],
    queryFn: async () => {
      if (!username) {
        throw new Error("Username is required");
      }

      return getUserProfileByUsername(username);
    },
    enabled: enabled && Boolean(username),
  });
}
