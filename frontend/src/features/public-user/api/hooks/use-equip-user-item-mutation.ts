"use client";

import { useMutation } from "@tanstack/react-query";

import { equipUserItem } from "../requests/equip-user-item";

export function useEquipUserItemMutation() {
  return useMutation({
    mutationFn: equipUserItem,
  });
}
