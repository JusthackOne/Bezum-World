"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";
import type { ApiEnvelope } from "@/shared/types/api-envelope";

interface AuthStatusStub {
  checkedAt: string;
  message: string;
  source: "frontend-stub";
}

async function getAuthStatusStub(): Promise<ApiEnvelope<AuthStatusStub>> {
  await new Promise((resolve) => setTimeout(resolve, 250));

  return {
    success: true,
    data: {
      checkedAt: new Date().toISOString(),
      message: "Auth module is connected as a frontend placeholder",
      source: "frontend-stub",
    },
    error: null,
  };
}

export function useAuthStatusQuery() {
  return useQuery({
    queryKey: queryKeys.authStatus,
    queryFn: getAuthStatusStub,
  });
}
