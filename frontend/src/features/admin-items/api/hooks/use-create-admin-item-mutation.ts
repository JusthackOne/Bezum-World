"use client";

import { useMutation } from "@tanstack/react-query";

import { createAdminItem } from "../requests/create-admin-item";

export function useCreateAdminItemMutation() {
  return useMutation({
    mutationFn: createAdminItem,
  });
}
