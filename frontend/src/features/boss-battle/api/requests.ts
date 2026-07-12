import { bossBattleEndpoints } from "./endpoints";
import type { BossAttackResult, BossBattle, BossLeaderboard } from "../model/boss-battle.types";
import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";

export async function getCurrentBossBattle(): Promise<BossBattle | null> {
  const current = await requestApiData<BossBattle[]>(
    () => clientHttpClient.get(bossBattleEndpoints.current),
    "Unable to load the current boss battle.",
  );
  if (!current[0]) return null;
  return requestApiData(
    () => clientHttpClient.get(bossBattleEndpoints.details(current[0]!.id)),
    "Unable to load the boss battle.",
  );
}

export function getBossLeaderboard(id: string, page: number): Promise<BossLeaderboard> {
  return requestApiData(
    () =>
      clientHttpClient.get(bossBattleEndpoints.leaderboard(id), { params: { page, limit: 20 } }),
    "Unable to load the boss leaderboard.",
  );
}

export function attackBoss(id: string): Promise<BossAttackResult> {
  return requestApiData(
    () => clientHttpClient.post(bossBattleEndpoints.attack(id)),
    "Unable to attack the boss.",
  );
}

export function claimBossReward(id: string): Promise<unknown> {
  return requestApiData(
    () => clientHttpClient.post(bossBattleEndpoints.claim(id)),
    "Unable to claim the reward.",
  );
}
