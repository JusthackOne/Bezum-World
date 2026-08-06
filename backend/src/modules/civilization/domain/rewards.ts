export interface IntegerRewardShare {
  playerId: string;
  amount: number;
  stableOrderIndex: number;
  receivedRemainderUnit: boolean;
}

export interface IntegerRewardSplit {
  totalAmount: number;
  playerCount: number;
  baseShare: number;
  remainder: number;
  shares: IntegerRewardShare[];
}

export function splitIntegerReward(
  totalAmount: number,
  playerIds: readonly string[],
): IntegerRewardSplit {
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 0) {
    throw new RangeError('Reward amount must be a non-negative safe integer');
  }
  if (playerIds.length === 0) {
    throw new RangeError('A reward cannot be split between zero players');
  }

  const uniquePlayerIds = new Set(playerIds);
  if (uniquePlayerIds.size !== playerIds.length || uniquePlayerIds.has('')) {
    throw new RangeError('Player identifiers must be unique and non-empty');
  }

  const stablePlayerIds = [...playerIds].sort(compareStableIdentifiers);
  const baseShare = Math.floor(totalAmount / stablePlayerIds.length);
  const remainder = totalAmount % stablePlayerIds.length;
  const shares = stablePlayerIds.map<IntegerRewardShare>((playerId, index) => ({
    playerId,
    amount: baseShare + (index < remainder ? 1 : 0),
    stableOrderIndex: index,
    receivedRemainderUnit: index < remainder,
  }));

  return {
    totalAmount,
    playerCount: stablePlayerIds.length,
    baseShare,
    remainder,
    shares,
  };
}

function compareStableIdentifiers(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
