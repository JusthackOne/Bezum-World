"use client";

import { useMutation } from "@tanstack/react-query";

import { startBattle } from "../requests/start-battle";

export function useStartBattleMutation() {
  return useMutation({
    mutationFn: startBattle,
  });
}
