import { bossBattleEndpoints } from "./endpoints";
import type {
  BossAttackResult,
  BossBattle,
  BossBattleHistory,
  BossClaimRewardResult,
  BossLeaderboard,
} from "../model/boss-battle.types";
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

export function getBossBattle(id: string): Promise<BossBattle> {
  return requestApiData(
    () => clientHttpClient.get(bossBattleEndpoints.details(id)),
    "Unable to load the boss battle.",
  );
}

export function getBossBattleHistory(page: number, limit = 20): Promise<BossBattleHistory> {
  return requestApiData(
    () => clientHttpClient.get(bossBattleEndpoints.history, { params: { page, limit } }),
    "Unable to load boss battle history.",
  );
}

export function getBossLeaderboard(id: string): Promise<BossLeaderboard> {
  return requestApiData(
    () => clientHttpClient.get(bossBattleEndpoints.leaderboard(id)),
    "Unable to load the boss leaderboard.",
  );
}

export function attackBoss(id: string): Promise<BossAttackResult> {
  return requestApiData(
    () => clientHttpClient.post(bossBattleEndpoints.attack(id)),
    "Unable to attack the boss.",
  );
}

export function claimBossReward(id: string): Promise<BossClaimRewardResult> {
  return requestApiData(
    () => clientHttpClient.post(bossBattleEndpoints.claim(id)),
    "Unable to claim the reward.",
  );
}
