"use client";

import { useMutation } from "@tanstack/react-query";

import { updateAdminItem } from "../requests/update-admin-item";

export function useUpdateAdminItemMutation() {
  return useMutation({
    mutationFn: updateAdminItem,
  });
}
