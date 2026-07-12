import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config/query-keys";
import { attackBoss, claimBossReward, getBossLeaderboard, getCurrentBossBattle } from "./requests";

export function useCurrentBossBattleQuery() {
  return useQuery({ queryKey: queryKeys.currentBossBattle, queryFn: getCurrentBossBattle });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.currentBossBattle }),
  });
}
