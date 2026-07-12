import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config/query-keys";
import {
  attackBoss,
  claimBossReward,
  getBossBattle,
  getBossBattleHistory,
  getBossLeaderboard,
  getCurrentBossBattle,
} from "./requests";

export function useCurrentBossBattleQuery() {
  return useQuery({ queryKey: queryKeys.currentBossBattle, queryFn: getCurrentBossBattle });
}
export function useBossBattleQuery(battleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bossBattleById(battleId ?? "none"),
    queryFn: () => getBossBattle(battleId!),
    enabled: Boolean(battleId),
  });
}
export function useBossBattleHistoryQuery(page: number) {
  return useQuery({
    queryKey: queryKeys.bossBattleHistory(page),
    queryFn: () => getBossBattleHistory(page),
    placeholderData: (previous) => previous,
  });
}
export function useBossLeaderboardQuery(battleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bossLeaderboard(battleId ?? "none"),
    queryFn: () => getBossLeaderboard(battleId!),
    enabled: Boolean(battleId),
  });
}
export function useAttackBossMutation(battleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => attackBoss(battleId!),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.currentBossBattle }),
        queryClient.invalidateQueries({ queryKey: ["boss-battles", battleId, "leaderboard"] }),
      ]);
    },
  });
}
export function useClaimBossRewardMutation(battleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => claimBossReward(battleId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.currentBossBattle }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bossBattleById(battleId!) }),
        queryClient.invalidateQueries({ queryKey: ["boss-battles", battleId, "leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "items"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]);
    },
  });
}
