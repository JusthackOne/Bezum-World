"use client";

import { useMutation } from "@tanstack/react-query";

import { loginAdmin } from "@/features/auth/api/login-admin";

export function useAdminLoginMutation() {
  return useMutation({
    mutationFn: loginAdmin,
  });
}
