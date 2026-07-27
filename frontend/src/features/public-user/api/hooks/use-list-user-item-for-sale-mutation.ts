"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { listUserItemForSale } from "../requests/list-user-item-for-sale";

export function useListUserItemForSaleMutation(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: listUserItemForSale,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.publicUserItems(username) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shopItemsPrefix }),
      ]);
    },
  });
}
