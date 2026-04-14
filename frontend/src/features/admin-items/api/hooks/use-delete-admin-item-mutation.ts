"use client";

import { useMutation } from "@tanstack/react-query";

import { deleteAdminItem } from "../requests/delete-admin-item";

export function useDeleteAdminItemMutation() {
  return useMutation({
    mutationFn: deleteAdminItem,
  });
}
