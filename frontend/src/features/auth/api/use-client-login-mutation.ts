"use client";

import { useMutation } from "@tanstack/react-query";

import { loginClientByCode } from "@/features/auth/api/login-client-by-code";

export function useClientLoginMutation() {
  return useMutation({
    mutationFn: loginClientByCode,
  });
}
