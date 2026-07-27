"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { removeUserItemFromSale } from "../requests/remove-user-item-from-sale";

export function useRemoveUserItemFromSaleMutation(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeUserItemFromSale,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.publicUserItems(username) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shopItemsPrefix }),
      ]);
    },
  });
}
