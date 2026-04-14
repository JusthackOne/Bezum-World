"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getUserEquipment } from "../requests/get-user-equipment";

export function useUserEquipmentQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.userEquipment(userId),
    queryFn: () => getUserEquipment(userId),
    enabled,
  });
}
