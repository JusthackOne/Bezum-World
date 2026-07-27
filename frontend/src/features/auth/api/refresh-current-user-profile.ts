import type { QueryClient } from "@tanstack/react-query";

import { useClientAuthStore } from "@/features/auth/model";
import { queryKeys } from "@/shared/config/query-keys";

export async function refreshCurrentUserProfile(queryClient: QueryClient): Promise<void> {
  const username = useClientAuthStore.getState().session?.user.username.trim();
  if (!username) {
    return;
  }

  await queryClient.invalidateQueries({
    queryKey: queryKeys.publicUserProfile(username),
    refetchType: "active",
  });
}
