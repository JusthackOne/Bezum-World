export const BOSS_BATTLES_QUEUE = 'boss-battles';
export const ACTIVATE_JOB = 'activate';
export const EXPIRE_JOB = 'expire';
export const FINALIZE_JOB = 'finalize';

export type BossBattleJobName = typeof ACTIVATE_JOB | typeof EXPIRE_JOB | typeof FINALIZE_JOB;

export function getBossBattleJobId(jobName: BossBattleJobName, battleId: string): string {
  return `boss-battle-${jobName}-${battleId}`;
}
