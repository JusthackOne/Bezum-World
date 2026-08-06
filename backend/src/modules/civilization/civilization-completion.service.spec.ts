import { describe, expect, test } from 'bun:test';
import { CivilizationGameStatus } from '@prisma/client';

import { CivilizationCompletionService } from './civilization-completion.service';
import { CivilizationException } from './civilization.errors';
import type { CivilizationConnectivityService } from './civilization-connectivity.service';
import type { CivilizationRuntimeService } from './civilization-runtime.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type {
  CivilizationRepository,
  CivilizationStateRecord,
  CivilizationTransaction,
} from './repositories';

interface RewardHarness {
  service: CivilizationCompletionService;
  accountReward: () => number;
  appliedDistributionCount: () => number;
  claimedEventCount: () => number;
}

function createRewardHarness(options: {
  eligible: boolean;
  unavailableReason?: string | null;
}): RewardHarness {
  const now = new Date('2026-08-01T12:00:00.000Z');
  let accountReward = 0;
  let appliedDistributionCount = 0;
  let claimedEventCount = 0;
  const claim = {
    id: 'claim-1',
    eligible: options.eligible,
    unavailableReason: options.unavailableReason ?? null,
    rewardJson: { gold: options.eligible ? 25 : 0, attributes: {} },
    expiresAt: null as Date | null,
    claimedAt: null as Date | null,
  };
  const state = {
    id: 'game-1',
    status: CivilizationGameStatus.COMPLETED,
    players: [{ id: 'player-1', userId: 'user-1', teamId: 'team-1' }],
  } as unknown as CivilizationStateRecord;
  const tx = {} as CivilizationTransaction;
  const repository = {
    transaction: async <T>(callback: (transaction: CivilizationTransaction) => Promise<T>) =>
      callback(tx),
    lockGameState: async () => undefined,
    findStateById: async () => state,
    findRewardClaim: async () => claim,
    listPendingRewardDistributions: async () =>
      appliedDistributionCount === 0
        ? [
            {
              id: 'distribution-1',
              amount: 25,
              attributeKey: null,
            },
          ]
        : [],
    incrementAccountReward: async (_userId: string, _key: string, amount: number) => {
      accountReward += amount;
    },
    markRewardDistributionApplied: async () => {
      appliedDistributionCount += 1;
    },
    updateRewardClaim: async (_claimId: string, data: { claimedAt?: Date | string | null }) => {
      claim.claimedAt = data.claimedAt instanceof Date ? data.claimedAt : null;
    },
    createEvent: async () => {
      claimedEventCount += 1;
      return {};
    },
  } as unknown as CivilizationRepository;
  const runtime = { now: () => now } as CivilizationRuntimeService;
  const connectivity = {} as CivilizationConnectivityService;

  return {
    service: new CivilizationCompletionService(repository, connectivity, runtime, {
      enqueue: async () => undefined,
    } as NotificationsService),
    accountReward: () => accountReward,
    appliedDistributionCount: () => appliedDistributionCount,
    claimedEventCount: () => claimedEventCount,
  };
}

describe('CivilizationCompletionService reward claims', () => {
  test('grants a pending reward only after claim and exactly once', async () => {
    const harness = createRewardHarness({ eligible: true });

    expect(harness.accountReward()).toBe(0);
    expect(await harness.service.claimReward('game-1', 'user-1')).toMatchObject({
      status: 'CLAIMED',
      reward: { gold: 25 },
    });
    expect(await harness.service.claimReward('game-1', 'user-1')).toMatchObject({
      status: 'ALREADY_CLAIMED',
      reward: { gold: 25 },
    });

    expect(harness.accountReward()).toBe(25);
    expect(harness.appliedDistributionCount()).toBe(1);
    expect(harness.claimedEventCount()).toBe(1);
  });

  test('rejects a losing-team claim after Town Hall destruction', async () => {
    const harness = createRewardHarness({
      eligible: false,
      unavailableReason: "No reward is available because your team's Town Hall was destroyed.",
    });

    await expect(harness.service.claimReward('game-1', 'user-1')).rejects.toBeInstanceOf(
      CivilizationException,
    );
    expect(harness.accountReward()).toBe(0);
    expect(harness.appliedDistributionCount()).toBe(0);
    expect(harness.claimedEventCount()).toBe(0);
  });
});
