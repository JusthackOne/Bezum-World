import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BossBattleStatus, BossRewardClaimStatus, Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';
import { BATTLES_FORMULA_IDENTIFIER, BATTLES_FORMULA_VERSION } from '../battles/battle-power';
import {
  BOSS_BATTLES_QUEUE,
  ACTIVATE_JOB,
  EXPIRE_JOB,
  FINALIZE_JOB,
} from './boss-battles.constants';
import { BossBattlesRepository } from './boss-battles.repository';
import type { BossRewardDto, CreateBossBattleDto, UpdateBossBattleDto } from './dto';
import {
  calculateBossDamage,
  denseRank,
  getCooldownSlot,
  resolveReward,
  validateRewardRanges,
} from './boss-battle.utils';

@Injectable()
export class BossBattlesService {
  constructor(
    private readonly repository: BossBattlesRepository,
    @InjectQueue(BOSS_BATTLES_QUEUE) private readonly queue: Queue,
  ) {}

  async create(adminId: string, input: CreateBossBattleDto) {
    this.validatePeriod(input.startsAt, input.endsAt);
    this.validateRewards(input.rewards);
    const now = new Date();
    const status = input.publish
      ? new Date(input.startsAt) <= now
        ? BossBattleStatus.ACTIVE
        : BossBattleStatus.SCHEDULED
      : BossBattleStatus.DRAFT;
    const battle = await this.repository.transaction(async (tx) =>
      this.repository.create(
        {
          name: input.name,
          description: input.description ?? null,
          imageUrl: input.imageUrl ?? null,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          initialHp: input.initialHp,
          currentHp: input.initialHp,
          ...input.attributes,
          attackCooldownSeconds: input.attackCooldownSeconds,
          status,
          rewards: { create: input.rewards.map((reward) => this.rewardCreate(reward)) },
          auditLogs: {
            create: { adminUserId: adminId, action: 'CREATED', afterData: this.json(input) },
          },
        },
        tx,
      ),
    );
    if (input.publish) await this.schedule(battle.id, battle.startsAt, battle.endsAt);
    return battle;
  }

  list(history = false) {
    return this.repository.listBattles(
      history
        ? [BossBattleStatus.COMPLETED, BossBattleStatus.EXPIRED, BossBattleStatus.CANCELLED]
        : undefined,
    );
  }
  current() {
    return this.repository.findCurrent();
  }
  async get(id: string, userId?: string) {
    const battle = await this.repository.findBattle(id);
    if (!battle) throw this.error('BOSS_BATTLE_NOT_FOUND', 404);
    const participant = userId ? await this.repository.findParticipant(id, userId) : null;
    return {
      ...battle,
      serverTime: new Date(),
      participant,
      canAttack:
        battle.status === BossBattleStatus.ACTIVE &&
        battle.currentHp > 0 &&
        new Date() >= battle.startsAt &&
        new Date() < battle.endsAt &&
        (!participant || participant.nextAttackAt <= new Date()),
      nextAttackAt: participant?.nextAttackAt ?? null,
    };
  }

  async leaderboard(id: string, userId: string, page: number, limit: number) {
    if (!(await this.repository.findBattle(id))) throw this.error('BOSS_BATTLE_NOT_FOUND', 404);
    const safeLimit = Math.min(limit, 100);
    const [rows, total, ownParticipant] = await Promise.all([
      this.repository.findLeaderboard(id, (page - 1) * safeLimit, safeLimit),
      this.repository.countParticipants(id),
      this.repository.findParticipant(id, userId),
    ]);
    const mapped = rows.map((row) => ({ ...row, place: Number(row.place) }));
    let own: (typeof mapped)[number] | null = mapped.find((row) => row.userId === userId) ?? null;
    if (!own && ownParticipant) {
      const all = await this.repository.findLeaderboard(id, 0, total);
      const row = all.find((entry) => entry.userId === userId);
      own = row ? { ...row, place: Number(row.place) } : null;
    }
    return { items: mapped, own, page, limit: safeLimit, total };
  }

  async attack(id: string, userId: string, now = new Date(), random = Math.random) {
    let defeated = false;
    const result = await this.repository.transaction(async (tx) => {
      const battle = await this.repository.lockBattle(id, tx);
      if (!battle) throw this.error('BOSS_BATTLE_NOT_FOUND', 404);
      if (now < battle.startsAt) throw this.error('BOSS_BATTLE_NOT_STARTED');
      if (now >= battle.endsAt) throw this.error('BOSS_BATTLE_EXPIRED');
      if (battle.currentHp <= 0) throw this.error('BOSS_ALREADY_DEFEATED');
      if (battle.status !== BossBattleStatus.ACTIVE) throw this.error('BOSS_BATTLE_NOT_ACTIVE');
      const user = await this.repository.findUser(userId, tx);
      if (!user) throw this.error('USER_NOT_FOUND', 404);
      const slot = getCooldownSlot(now, battle.attackCooldownSeconds);
      const next = new Date(slot.getTime() + battle.attackCooldownSeconds * 1000);
      const userAttributes = {
        strength: user.strength,
        charisma: user.charisma,
        endurance: user.endurance,
        intelligence: user.intelligence,
      };
      const bossAttributes = {
        strength: battle.strength,
        charisma: battle.charisma,
        endurance: battle.endurance,
        intelligence: battle.intelligence,
      };
      const randomMultiplier = 0.9 + random() * 0.2;
      const damage = calculateBossDamage(userAttributes, bossAttributes, randomMultiplier);
      const appliedDamage = Math.min(damage.calculatedDamage, battle.currentHp);
      try {
        await this.repository.createAttack(
          {
            bossBattleId: id,
            userId,
            calculatedDamage: damage.calculatedDamage,
            appliedDamage,
            userPower: damage.userPower,
            bossPower: damage.bossPower,
            randomMultiplier,
            userAttributesSnapshot: userAttributes,
            bossAttributesSnapshot: bossAttributes,
            formulaIdentifier: BATTLES_FORMULA_IDENTIFIER,
            formulaVersion: BATTLES_FORMULA_VERSION,
            attackedAt: now,
            cooldownSlot: slot,
          },
          tx,
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
          throw this.error('ATTACK_ALREADY_USED_FOR_CURRENT_SLOT', 409);
        throw error;
      }
      const participant = await this.repository.upsertParticipant(
        id,
        userId,
        appliedDamage,
        now,
        slot,
        next,
        tx,
      );
      const hp = battle.currentHp - appliedDamage;
      defeated = hp === 0;
      await this.repository.update(
        id,
        {
          currentHp: hp,
          totalAppliedDamage: { increment: appliedDamage },
          version: { increment: 1 },
          ...(defeated
            ? { status: BossBattleStatus.DEFEATED, defeatedAt: now, finishedAt: now }
            : {}),
        },
        tx,
      );
      return {
        battleId: id,
        calculatedDamage: damage.calculatedDamage,
        appliedDamage,
        currentHp: hp,
        initialHp: battle.initialHp,
        myTotalDamage: participant.totalDamage,
        attacksCount: participant.attacksCount,
        currentCooldownSlot: slot,
        nextAttackAt: next,
        bossDefeated: defeated,
      };
    });
    if (defeated) await this.enqueueFinalize(id);
    return result;
  }

  async finalize(id: string) {
    return this.repository.transaction(async (tx) => {
      const battle = await this.repository.lockBattle(id, tx);
      if (!battle || battle.resultsFinalizedAt) return;
      if (
        battle.status !== BossBattleStatus.DEFEATED &&
        battle.status !== BossBattleStatus.FINALIZING
      )
        return;
      await this.repository.update(id, { status: BossBattleStatus.FINALIZING }, tx);
      const participants = await this.repository.findParticipants(id, tx);
      const places = denseRank(participants.map((participant) => participant.totalDamage));
      for (const [index, participant] of participants.entries()) {
        const place = places[index]!;
        const reward = battle.rewardsEnabled ? resolveReward(battle.rewards, place) : undefined;
        await this.repository.createResult(
          {
            bossBattleId: id,
            userId: participant.userId,
            place,
            totalDamage: participant.totalDamage,
            attacksCount: participant.attacksCount,
            firstAttackAt: participant.firstAttackAt,
            lastAttackAt: participant.lastAttackAt,
            rewardId: reward?.id ?? null,
            rewardClaimStatus: reward
              ? BossRewardClaimStatus.AVAILABLE
              : BossRewardClaimStatus.NOT_ELIGIBLE,
          },
          tx,
        );
      }
      await this.repository.update(
        id,
        {
          status: BossBattleStatus.COMPLETED,
          resultsFinalizedAt: new Date(),
          finishedAt: battle.finishedAt ?? new Date(),
        },
        tx,
      );
    });
  }

  async activate(id: string) {
    await this.repository.transaction(async (tx) => {
      const battle = await this.repository.lockBattle(id, tx);
      if (
        battle?.status === BossBattleStatus.SCHEDULED &&
        battle.startsAt <= new Date() &&
        battle.endsAt > new Date()
      )
        await this.repository.update(id, { status: BossBattleStatus.ACTIVE }, tx);
    });
  }
  async expire(id: string) {
    await this.repository.transaction(async (tx) => {
      const battle = await this.repository.lockBattle(id, tx);
      if (
        battle &&
        (battle.status === BossBattleStatus.ACTIVE ||
          battle.status === BossBattleStatus.SCHEDULED) &&
        battle.endsAt <= new Date() &&
        battle.currentHp > 0
      )
        await this.repository.update(
          id,
          { status: BossBattleStatus.EXPIRED, finishedAt: new Date(), rewardsEnabled: false },
          tx,
        );
    });
  }

  async claim(id: string, userId: string) {
    return this.repository.transaction(async (tx) => {
      const result = await this.repository.lockResult(id, userId, tx);
      if (!result?.battle.resultsFinalizedAt) throw this.error('BATTLE_RESULTS_NOT_FINALIZED');
      if (
        result.rewardClaimStatus === BossRewardClaimStatus.CLAIMED ||
        result.claim?.status === BossRewardClaimStatus.CLAIMED
      )
        throw this.error('REWARD_ALREADY_CLAIMED', 409);
      if (
        result.rewardClaimStatus !== BossRewardClaimStatus.AVAILABLE ||
        !result.reward ||
        !result.battle.rewardsEnabled
      )
        throw this.error('REWARD_NOT_AVAILABLE');
      const snapshot = this.json({
        place: result.place,
        gold: result.reward.goldAmount,
        gameScore: result.reward.gameScoreAmount,
        attributes: {
          strength: result.reward.strength,
          charisma: result.reward.charisma,
          endurance: result.reward.endurance,
          intelligence: result.reward.intelligence,
        },
        item: result.reward.itemTemplate,
      });
      await this.repository.grantClaim(result, snapshot, tx);
      return snapshot;
    });
  }

  async update(adminId: string, id: string, input: UpdateBossBattleDto) {
    if (input.startsAt && input.endsAt) this.validatePeriod(input.startsAt, input.endsAt);
    if (input.rewards) this.validateRewards(input.rewards);
    const result = await this.repository.transaction(async (tx) => {
      const before = await this.repository.lockBattle(id, tx);
      if (!before) throw this.error('BOSS_BATTLE_NOT_FOUND', 404);
      if (input.rewards && (await this.repository.hasClaimedReward(id, tx)))
        throw this.error('REWARD_ALREADY_CLAIMED', 409);
      const startsAt = input.startsAt ? new Date(input.startsAt) : before.startsAt;
      const endsAt = input.endsAt ? new Date(input.endsAt) : before.endsAt;
      this.validatePeriod(startsAt.toISOString(), endsAt.toISOString());
      const initialHp = input.initialHp ?? before.initialHp;
      const currentHp =
        input.initialHp === undefined
          ? before.currentHp
          : Math.max(0, initialHp - before.totalAppliedDamage);
      const after = await this.repository.update(
        id,
        {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          startsAt,
          endsAt,
          initialHp,
          currentHp,
          ...(input.attackCooldownSeconds !== undefined
            ? { attackCooldownSeconds: input.attackCooldownSeconds }
            : {}),
          ...(input.attributes ?? {}),
          version: { increment: 1 },
          ...(currentHp === 0 && before.status === BossBattleStatus.ACTIVE
            ? { status: BossBattleStatus.DEFEATED, defeatedAt: new Date(), finishedAt: new Date() }
            : {}),
          auditLogs: {
            create: {
              adminUserId: adminId,
              action: 'UPDATED',
              beforeData: this.json(before),
              afterData: this.json(input),
              ...(input.reason !== undefined ? { reason: input.reason } : {}),
            },
          },
        },
        tx,
      );
      if (input.rewards)
        await this.repository.replaceRewards(
          id,
          input.rewards.map((reward) => ({ bossBattleId: id, ...this.rewardScalars(reward) })),
          input.rewards.flatMap((reward, index) =>
            reward.item ? [{ rewardIndex: index, data: this.itemScalars(reward.item) }] : [],
          ),
          tx,
        );
      return after;
    });
    if (input.startsAt || input.endsAt) await this.schedule(id, result.startsAt, result.endsAt);
    if (result.currentHp === 0) await this.enqueueFinalize(id);
    return this.repository.findBattle(id);
  }

  async finish(
    adminId: string,
    id: string,
    grantRewards: boolean,
    confirm: boolean,
    reason?: string,
  ) {
    if (!confirm) throw this.error('ADMIN_CONFIRMATION_REQUIRED');
    await this.repository.transaction(async (tx) => {
      const battle = await this.repository.lockBattle(id, tx);
      if (!battle) throw this.error('BOSS_BATTLE_NOT_FOUND', 404);
      await this.repository.update(
        id,
        {
          status: grantRewards ? BossBattleStatus.DEFEATED : BossBattleStatus.CANCELLED,
          rewardsEnabled: grantRewards,
          finishedAt: new Date(),
          auditLogs: {
            create: {
              adminUserId: adminId,
              action: grantRewards ? 'MANUAL_FINISH' : 'CANCELLED',
              beforeData: this.json(battle),
              afterData: this.json({ grantRewards }),
              ...(reason !== undefined ? { reason } : {}),
            },
          },
        },
        tx,
      );
    });
    if (grantRewards) await this.enqueueFinalize(id);
  }

  private async schedule(id: string, startsAt: Date, endsAt: Date) {
    await Promise.all([
      this.replaceJob(`boss-battle-activate:${id}`, ACTIVATE_JOB, id, startsAt),
      this.replaceJob(`boss-battle-expire:${id}`, EXPIRE_JOB, id, endsAt),
    ]);
  }
  private async replaceJob(jobId: string, name: string, id: string, at: Date) {
    const old = await this.queue.getJob(jobId);
    if (old) await old.remove();
    await this.queue.add(
      name,
      { battleId: id },
      {
        jobId,
        delay: Math.max(0, at.getTime() - Date.now()),
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }
  private enqueueFinalize(id: string) {
    return this.queue.add(
      FINALIZE_JOB,
      { battleId: id },
      {
        jobId: `boss-battle-finalize:${id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );
  }
  private validatePeriod(start: string, end: string) {
    if (new Date(start) >= new Date(end)) throw this.error('INVALID_BATTLE_PERIOD');
  }
  private validateRewards(rewards: BossRewardDto[]) {
    try {
      validateRewardRanges(rewards);
    } catch (error) {
      throw this.error(error instanceof Error ? error.message : 'INVALID_REWARD_CONFIGURATION');
    }
    for (const reward of rewards) {
      if (
        reward.placeTo < reward.placeFrom ||
        !(
          reward.gold ||
          reward.gameScore ||
          reward.item ||
          Object.values(reward.attributes ?? {}).some(Boolean)
        )
      )
        throw this.error('INVALID_REWARD_CONFIGURATION');
    }
  }
  private rewardScalars(reward: BossRewardDto) {
    return {
      placeFrom: reward.placeFrom,
      placeTo: reward.placeTo,
      goldAmount: reward.gold ?? 0,
      gameScoreAmount: reward.gameScore ?? 0,
      strength: reward.attributes?.strength ?? 0,
      charisma: reward.attributes?.charisma ?? 0,
      endurance: reward.attributes?.endurance ?? 0,
      intelligence: reward.attributes?.intelligence ?? 0,
    };
  }
  private itemScalars(item: NonNullable<BossRewardDto['item']>) {
    return {
      name: item.name,
      description: item.description ?? null,
      imageUrl: item.imageUrl ?? null,
      slotType: item.slotType,
      rarity: item.rarity,
      durability: item.durability ?? null,
      strength: item.attributes?.strength ?? null,
      charisma: item.attributes?.charisma ?? null,
      agility: item.attributes?.endurance ?? null,
      intelligence: item.attributes?.intelligence ?? null,
      metadata: item.metadata ? this.json(item.metadata) : Prisma.JsonNull,
    };
  }
  private rewardCreate(reward: BossRewardDto): Prisma.BossBattleRewardCreateWithoutBattleInput {
    return {
      ...this.rewardScalars(reward),
      ...(reward.item ? { itemTemplate: { create: this.itemScalars(reward.item) } } : {}),
    };
  }
  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
  private error(code: string, status = 400) {
    if (status === 404) return new NotFoundException({ code });
    if (status === 409) return new ConflictException({ code });
    return new BadRequestException({ code });
  }
}
