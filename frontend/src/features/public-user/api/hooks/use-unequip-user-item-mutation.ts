"use client";

import { useMutation } from "@tanstack/react-query";

import { unequipUserItem } from "../requests/unequip-user-item";

export function useUnequipUserItemMutation() {
  return useMutation({
    mutationFn: unequipUserItem,
  });
}
