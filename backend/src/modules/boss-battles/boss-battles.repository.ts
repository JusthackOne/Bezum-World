import { Injectable } from '@nestjs/common';
import { BossBattleStatus, BossRewardClaimStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class BossBattlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async lockBattle(id: string, tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM boss_battles WHERE id = ${id} FOR UPDATE`;
    if (rows.length === 0) return null;
    return tx.bossBattle.findUnique({
      where: { id },
      include: { rewards: { include: { itemTemplate: true } } },
    });
  }

  findBattle(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).bossBattle.findUnique({
      where: { id },
      include: { rewards: { include: { itemTemplate: true } } },
    });
  }

  listBattles(statuses?: BossBattleStatus[]) {
    return this.prisma.bossBattle.findMany({
      where: statuses ? { status: { in: statuses } } : {},
      include: { rewards: { include: { itemTemplate: true } } },
      orderBy: { startsAt: 'desc' },
    });
  }

  async listPublicHistory(page: number, limit: number) {
    const where: Prisma.BossBattleWhereInput = { status: { not: BossBattleStatus.DRAFT } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.bossBattle.findMany({
        where,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          status: true,
          initialHp: true,
          currentHp: true,
          startsAt: true,
          endsAt: true,
          defeatedAt: true,
          finishedAt: true,
          createdAt: true,
          participants: {
            orderBy: [{ totalDamage: 'desc' }, { lastAttackAt: 'asc' }, { userId: 'asc' }],
            take: 1,
            select: {
              user: { select: { id: true, username: true, avatarUrl: true } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bossBattle.count({ where }),
    ]);
    return { items, total };
  }

  findCurrent() {
    return this.prisma.bossBattle.findMany({
      where: { status: BossBattleStatus.ACTIVE },
      include: { rewards: { include: { itemTemplate: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  create(data: Prisma.BossBattleCreateInput, tx: Prisma.TransactionClient) {
    return tx.bossBattle.create({
      data,
      include: { rewards: { include: { itemTemplate: true } } },
    });
  }

  update(id: string, data: Prisma.BossBattleUpdateInput, tx: Prisma.TransactionClient) {
    return tx.bossBattle.update({
      where: { id },
      data,
      include: { rewards: { include: { itemTemplate: true } } },
    });
  }

  replaceRewards(
    battleId: string,
    rewards: Prisma.BossBattleRewardCreateManyInput[],
    itemTemplates: Array<{
      rewardIndex: number;
      data: Prisma.BossRewardItemTemplateUncheckedCreateWithoutRewardInput;
    }>,
    tx: Prisma.TransactionClient,
  ) {
    return (async () => {
      await tx.bossRewardItemTemplate.deleteMany({ where: { reward: { bossBattleId: battleId } } });
      await tx.bossBattleReward.deleteMany({ where: { bossBattleId: battleId } });
      for (let index = 0; index < rewards.length; index += 1) {
        const reward = rewards[index];
        if (!reward) continue;
        const created = await tx.bossBattleReward.create({ data: reward });
        const template = itemTemplates.find((entry) => entry.rewardIndex === index);
        if (template)
          await tx.bossRewardItemTemplate.create({
            data: { ...template.data, bossBattleRewardId: created.id },
          });
      }
    })();
  }

  findUser(userId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.account.findUnique({ where: { id: userId } });
  }

  createAttack(data: Prisma.BossAttackUncheckedCreateInput, tx: Prisma.TransactionClient) {
    return tx.bossAttack.create({ data });
  }
  upsertParticipant(
    battleId: string,
    userId: string,
    damage: number,
    attackedAt: Date,
    slot: Date,
    next: Date,
    tx: Prisma.TransactionClient,
  ) {
    return tx.bossBattleParticipant.upsert({
      where: { bossBattleId_userId: { bossBattleId: battleId, userId } },
      create: {
        bossBattleId: battleId,
        userId,
        totalDamage: damage,
        attacksCount: 1,
        firstAttackAt: attackedAt,
        lastAttackAt: attackedAt,
        lastCooldownSlot: slot,
        nextAttackAt: next,
      },
      update: {
        totalDamage: { increment: damage },
        attacksCount: { increment: 1 },
        lastAttackAt: attackedAt,
        lastCooldownSlot: slot,
        nextAttackAt: next,
      },
    });
  }

  findParticipant(battleId: string, userId: string) {
    return this.prisma.bossBattleParticipant.findUnique({
      where: { bossBattleId_userId: { bossBattleId: battleId, userId } },
    });
  }
  findParticipants(battleId: string, tx: Prisma.TransactionClient) {
    return tx.bossBattleParticipant.findMany({
      where: { bossBattleId: battleId },
      orderBy: [{ totalDamage: 'desc' }, { lastAttackAt: 'asc' }, { userId: 'asc' }],
    });
  }
  async hasClaimedReward(battleId: string, tx: Prisma.TransactionClient) {
    return (
      (await tx.bossRewardClaim.count({
        where: { bossBattleId: battleId, status: BossRewardClaimStatus.CLAIMED },
      })) > 0
    );
  }
  countParticipants(battleId: string) {
    return this.prisma.bossBattleParticipant.count({ where: { bossBattleId: battleId } });
  }
  findLeaderboard(battleId: string, skip: number, take: number) {
    return this.prisma.$queryRaw<
      Array<{
        place: bigint;
        userId: string;
        username: string;
        avatarUrl: string | null;
        totalDamage: number;
        attacksCount: number;
        lastAttackAt: Date;
      }>
    >`
      SELECT ranked.place, ranked.user_id AS "userId", a.username, a."avatarUrl", ranked.total_damage AS "totalDamage", ranked.attacks_count AS "attacksCount", ranked.last_attack_at AS "lastAttackAt"
      FROM (SELECT p.*, DENSE_RANK() OVER (ORDER BY p.total_damage DESC) AS place FROM boss_battle_participants p WHERE p.boss_battle_id = ${battleId}) ranked
      JOIN "Account" a ON a.id = ranked.user_id
      ORDER BY ranked.place, ranked.last_attack_at, ranked.user_id OFFSET ${skip} LIMIT ${take}`;
  }

  findFinalLeaderboard(battleId: string) {
    return this.prisma.bossBattleResult.findMany({
      where: { bossBattleId: battleId },
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: [{ place: 'asc' }, { lastAttackAt: 'asc' }, { userId: 'asc' }],
    });
  }

  createResult(data: Prisma.BossBattleResultUncheckedCreateInput, tx: Prisma.TransactionClient) {
    return tx.bossBattleResult.upsert({
      where: { bossBattleId_userId: { bossBattleId: data.bossBattleId, userId: data.userId } },
      create: data,
      update: {},
    });
  }
  lockResult(battleId: string, userId: string, tx: Prisma.TransactionClient) {
    return (async () => {
      await tx.$queryRaw`SELECT id FROM boss_battle_results WHERE boss_battle_id = ${battleId} AND user_id = ${userId} FOR UPDATE`;
      return tx.bossBattleResult.findUnique({
        where: { bossBattleId_userId: { bossBattleId: battleId, userId } },
        include: { reward: { include: { itemTemplate: true } }, claim: true, battle: true },
      });
    })();
  }
  grantClaim(
    result: NonNullable<Awaited<ReturnType<BossBattlesRepository['lockResult']>>>,
    snapshot: Prisma.InputJsonValue,
    tx: Prisma.TransactionClient,
  ) {
    const reward = result.reward!;
    return (async () => {
      const claim = await tx.bossRewardClaim.create({
        data: {
          bossBattleId: result.bossBattleId,
          bossBattleResultId: result.id,
          bossBattleRewardId: reward.id,
          userId: result.userId,
          place: result.place,
          status: BossRewardClaimStatus.PROCESSING,
          idempotencyKey: `boss-battle:${result.bossBattleId}:${result.userId}`,
          rewardSnapshot: snapshot,
        },
      });
      await tx.account.update({
        where: { id: result.userId },
        data: {
          balance: { increment: reward.goldAmount },
          gameScore: { increment: reward.gameScoreAmount },
          strength: { increment: reward.strength },
          charisma: { increment: reward.charisma },
          endurance: { increment: reward.endurance },
          intelligence: { increment: reward.intelligence },
        },
      });
      if (reward.itemTemplate)
        await tx.item.create({
          data: {
            ownerUserId: result.userId,
            name: reward.itemTemplate.name,
            description: reward.itemTemplate.description,
            imageUrl: reward.itemTemplate.imageUrl,
            strength: reward.itemTemplate.strength,
            charisma: reward.itemTemplate.charisma,
            agility: reward.itemTemplate.agility,
            intelligence: reward.itemTemplate.intelligence,
            price: 0,
            rarity: reward.itemTemplate.rarity,
            slotType: reward.itemTemplate.slotType,
            durability: reward.itemTemplate.durability,
          },
        });
      await tx.bossBattleResult.update({
        where: { id: result.id },
        data: { rewardClaimStatus: BossRewardClaimStatus.CLAIMED },
      });
      return tx.bossRewardClaim.update({
        where: { id: claim.id },
        data: { status: BossRewardClaimStatus.CLAIMED, claimedAt: new Date() },
      });
    })();
  }
}
