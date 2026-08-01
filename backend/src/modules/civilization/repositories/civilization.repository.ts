import { Injectable } from '@nestjs/common';
import {
  CivilizationActionType,
  CivilizationAdminActionType,
  CivilizationAttributeKey,
  CivilizationBuildingStatus,
  CivilizationBuildingType,
  CivilizationEventType,
  CivilizationGameSnapshotType,
  CivilizationGameStatus,
  CivilizationTeamSide,
  CivilizationTerrainType,
  CivilizationTowerStatus,
  CivilizationTowerWorkKind,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type { CivilizationSettings } from '../domain';
import type { CivilizationMapInputDto, CivilizationTeamInputDto } from '../dto';

const civilizationStateInclude = {
  teams: { orderBy: { side: 'asc' as const } },
  players: {
    include: {
      user: {
        select: { id: true, username: true, avatarUrl: true },
      },
    },
    orderBy: { id: 'asc' as const },
  },
  tiles: { orderBy: [{ q: 'asc' as const }, { r: 'asc' as const }] },
  spawnPoints: { orderBy: { teamId: 'asc' as const } },
  buildings: true,
  towers: true,
  teamResources: true,
  attributeResources: true,
  rewardClaims: true,
  events: {
    where: { eventType: CivilizationEventType.CATAPULT_ATTACKED },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 10,
  },
} satisfies Prisma.CivilizationGameInclude;

const civilizationAdminListInclude = {
  teams: {
    include: { _count: { select: { players: true } } },
    orderBy: { side: 'asc' as const },
  },
} satisfies Prisma.CivilizationGameInclude;

const civilizationEventInclude = {
  actorPlayer: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
  targetPlayer: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
} satisfies Prisma.CivilizationEventInclude;

const civilizationStatisticEventTypes = [
  CivilizationEventType.PLAYER_MOVED,
  CivilizationEventType.TILE_CAPTURED,
  CivilizationEventType.PLAYER_ATTACKED,
  CivilizationEventType.BUILDING_CAPTURE_STARTED,
  CivilizationEventType.BUILDING_CAPTURE_PROGRESS,
  CivilizationEventType.BUILDING_CAPTURED,
  CivilizationEventType.TOWER_CONSTRUCTION_STARTED,
  CivilizationEventType.TOWER_DESTROYED,
  CivilizationEventType.TOWER_REPAIR_STARTED,
  CivilizationEventType.TOWER_REPAIRED,
  CivilizationEventType.TOWN_HALL_CAPTURE_PROGRESS,
  CivilizationEventType.TOWN_HALL_CAPTURED,
  CivilizationEventType.TOWN_HALL_DEFENDED,
  CivilizationEventType.TEAM_GOLD_SPENT,
] as const;

export type CivilizationTransaction = Prisma.TransactionClient;
export type CivilizationStateRecord = Prisma.CivilizationGameGetPayload<{
  include: typeof civilizationStateInclude;
}>;
export type CivilizationAdminListRecord = Prisma.CivilizationGameGetPayload<{
  include: typeof civilizationAdminListInclude;
}>;
export type CivilizationEventRecord = Prisma.CivilizationEventGetPayload<{
  include: typeof civilizationEventInclude;
}>;
export type CivilizationStatisticEventRecord = Prisma.CivilizationEventGetPayload<{
  select: {
    actorPlayerId: true;
    eventType: true;
    payloadJson: true;
  };
}>;

export interface ReplaceCivilizationConfigurationInput {
  name: string;
  startAt: Date;
  endAt: Date;
  teams: CivilizationTeamInputDto[];
  map: CivilizationMapInputDto;
  settings: CivilizationSettings;
}

export interface CivilizationEventInput {
  gameId: string;
  eventType: CivilizationEventType;
  payload: unknown;
  teamId?: string | null;
  actorPlayerId?: string | null;
  targetPlayerId?: string | null;
  tileId?: string | null;
}

@Injectable()
export class CivilizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (tx: CivilizationTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback, {
      isolationLevel: 'Serializable',
      maxWait: 10_000,
      timeout: 30_000,
    });
  }

  async acquireGameLock(gameId: string, tx: CivilizationTransaction): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`civilization:${gameId}`}))`;
  }

  async acquireScheduleLock(tx: CivilizationTransaction): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('civilization:schedule'))`;
  }

  async lockGameState(gameId: string, tx: CivilizationTransaction): Promise<void> {
    await this.acquireGameLock(gameId, tx);
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "civilization_games" WHERE "id" = ${gameId} FOR UPDATE
    `;
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "civilization_game_players"
      WHERE "game_id" = ${gameId} ORDER BY "id" FOR UPDATE
    `;
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "civilization_tiles"
      WHERE "game_id" = ${gameId} ORDER BY "id" FOR UPDATE
    `;
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "civilization_buildings"
      WHERE "game_id" = ${gameId} ORDER BY "id" FOR UPDATE
    `;
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "civilization_towers"
      WHERE "game_id" = ${gameId} ORDER BY "id" FOR UPDATE
    `;
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "civilization_team_resources"
      WHERE "game_id" = ${gameId} ORDER BY "id" FOR UPDATE
    `;
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "civilization_team_attribute_resources"
      WHERE "game_id" = ${gameId} ORDER BY "id" FOR UPDATE
    `;
  }

  async findCurrentGame(now: Date): Promise<CivilizationStateRecord | null> {
    const active = await this.prisma.civilizationGame.findFirst({
      where: { status: CivilizationGameStatus.ACTIVE },
      include: civilizationStateInclude,
      orderBy: { startAt: 'asc' },
    });
    if (active) return active;

    const scheduled = await this.prisma.civilizationGame.findFirst({
      where: { status: CivilizationGameStatus.SCHEDULED, endAt: { gt: now } },
      include: civilizationStateInclude,
      orderBy: { startAt: 'asc' },
    });
    if (scheduled) return scheduled;

    return this.prisma.civilizationGame.findFirst({
      where: { status: CivilizationGameStatus.COMPLETED },
      include: civilizationStateInclude,
      orderBy: { completedAt: 'desc' },
    });
  }

  findStateById(
    gameId: string,
    tx?: CivilizationTransaction,
  ): Promise<CivilizationStateRecord | null> {
    return this.client(tx).civilizationGame.findUnique({
      where: { id: gameId },
      include: civilizationStateInclude,
    });
  }

  async listHistory(
    page: number,
    limit: number,
  ): Promise<{
    items: CivilizationStateRecord[];
    total: number;
  }> {
    const where: Prisma.CivilizationGameWhereInput = { status: CivilizationGameStatus.COMPLETED };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.civilizationGame.findMany({
        where,
        include: civilizationStateInclude,
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.civilizationGame.count({ where }),
    ]);
    return { items, total };
  }

  async listForAdmin(
    page: number,
    limit: number,
    search?: string,
    status?: CivilizationGameStatus,
  ): Promise<{
    items: CivilizationAdminListRecord[];
    total: number;
  }> {
    const normalizedSearch = search?.trim();
    const where: Prisma.CivilizationGameWhereInput = {
      ...(status ? { status } : {}),
      ...(normalizedSearch
        ? { name: { contains: normalizedSearch, mode: 'insensitive' as const } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.civilizationGame.findMany({
        where,
        include: civilizationAdminListInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.civilizationGame.count({ where }),
    ]);
    return { items, total };
  }

  async listEvents(
    gameId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: CivilizationEventRecord[];
    total: number;
  }> {
    const where: Prisma.CivilizationEventWhereInput = { gameId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.civilizationEvent.findMany({
        where,
        include: civilizationEventInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.civilizationEvent.count({ where }),
    ]);
    return { items, total };
  }

  listStatisticEvents(
    gameId: string,
    tx?: CivilizationTransaction,
  ): Promise<CivilizationStatisticEventRecord[]> {
    return this.client(tx).civilizationEvent.findMany({
      where: {
        gameId,
        actorPlayerId: { not: null },
        eventType: { in: [...civilizationStatisticEventTypes] },
      },
      select: { actorPlayerId: true, eventType: true, payloadJson: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async listAudit(
    gameId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: Awaited<ReturnType<PrismaService['civilizationAdminAuditLog']['findMany']>>;
    total: number;
  }> {
    const where: Prisma.CivilizationAdminAuditLogWhereInput = { gameId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.civilizationAdminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.civilizationAdminAuditLog.count({ where }),
    ]);
    return { items, total };
  }

  findAction(
    gameId: string,
    playerId: string,
    idempotencyKey: string,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationAction.findUnique({
      where: { gameId_playerId_idempotencyKey: { gameId, playerId, idempotencyKey } },
    });
  }

  createAction(
    input: {
      gameId: string;
      playerId: string;
      idempotencyKey: string;
      actionType: CivilizationActionType;
      requestPayload: unknown;
      resultPayload: unknown;
    },
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationAction.create({
      data: {
        gameId: input.gameId,
        playerId: input.playerId,
        idempotencyKey: input.idempotencyKey,
        actionType: input.actionType,
        requestPayload: this.json(input.requestPayload),
        resultPayload: this.json(input.resultPayload),
      },
    });
  }

  createEvent(input: CivilizationEventInput, tx: CivilizationTransaction) {
    return tx.civilizationEvent.create({
      data: {
        gameId: input.gameId,
        eventType: input.eventType,
        payloadJson: this.json(input.payload),
        teamId: input.teamId ?? null,
        actorPlayerId: input.actorPlayerId ?? null,
        targetPlayerId: input.targetPlayerId ?? null,
        tileId: input.tileId ?? null,
      },
      include: civilizationEventInclude,
    });
  }

  createAudit(
    input: {
      gameId: string;
      adminId: string;
      action: CivilizationAdminActionType;
      beforeData?: unknown;
      afterData?: unknown;
      metadata?: unknown;
    },
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationAdminAuditLog.create({
      data: {
        gameId: input.gameId,
        adminId: input.adminId,
        action: input.action,
        ...(input.beforeData === undefined ? {} : { beforeData: this.json(input.beforeData) }),
        ...(input.afterData === undefined ? {} : { afterData: this.json(input.afterData) }),
        ...(input.metadata === undefined ? {} : { metadata: this.json(input.metadata) }),
      },
    });
  }

  async acquireAdminMutationLock(
    adminId: string,
    action: CivilizationAdminActionType,
    idempotencyKey: string,
    tx: CivilizationTransaction,
  ): Promise<void> {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`civilization-admin:${adminId}:${action}:${idempotencyKey}`})
      )
    `;
  }

  findAdminMutation(
    adminId: string,
    action: CivilizationAdminActionType,
    idempotencyKey: string,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationAdminAuditLog.findFirst({
      where: {
        adminId,
        action,
        metadata: { path: ['idempotencyKey'], equals: idempotencyKey },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createConfiguredGame(
    adminId: string,
    input: ReplaceCivilizationConfigurationInput,
    tx: CivilizationTransaction,
  ): Promise<CivilizationStateRecord> {
    const game = await tx.civilizationGame.create({
      data: {
        name: input.name,
        startAt: input.startAt,
        endAt: input.endAt,
        settingsJson: this.json(input.settings),
        createdByAdminId: adminId,
      },
    });
    await this.insertConfiguration(game.id, input, tx);
    return (await this.findStateById(game.id, tx))!;
  }

  async replaceConfiguration(
    gameId: string,
    input: ReplaceCivilizationConfigurationInput,
    tx: CivilizationTransaction,
  ): Promise<CivilizationStateRecord> {
    await tx.civilizationGame.update({
      where: { id: gameId },
      data: {
        name: input.name,
        startAt: input.startAt,
        endAt: input.endAt,
        settingsJson: this.json(input.settings),
        winnerTeamId: null,
        stateVersion: { increment: 1 },
      },
    });
    await tx.civilizationTower.deleteMany({ where: { gameId } });
    await tx.civilizationBuilding.deleteMany({ where: { gameId } });
    await tx.civilizationSpawnPoint.deleteMany({ where: { gameId } });
    await tx.civilizationGamePlayer.deleteMany({ where: { gameId } });
    await tx.civilizationTeamAttributeResource.deleteMany({ where: { gameId } });
    await tx.civilizationTeamResource.deleteMany({ where: { gameId } });
    await tx.civilizationTeam.updateMany({ where: { gameId }, data: { townHallTileId: null } });
    await tx.civilizationTile.deleteMany({ where: { gameId } });
    await tx.civilizationTeam.deleteMany({ where: { gameId } });
    await this.insertConfiguration(gameId, input, tx);
    return (await this.findStateById(gameId, tx))!;
  }

  updateGame(
    gameId: string,
    data: Prisma.CivilizationGameUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationGame.update({ where: { id: gameId }, data });
  }

  updatePlayer(
    playerId: string,
    data: Prisma.CivilizationGamePlayerUncheckedUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationGamePlayer.update({ where: { id: playerId }, data });
  }

  placeActivePlayersAtTeamSpawns(
    gameId: string,
    spawnTileByTeamId: ReadonlyMap<string, string>,
    actionPointUnits: number,
    now: Date,
    tx: CivilizationTransaction,
  ): Promise<number> {
    return tx.civilizationGamePlayer
      .findMany({ where: { gameId, isActive: true }, select: { id: true, teamId: true } })
      .then(async (players) => {
        for (const player of players) {
          const spawnTileId = spawnTileByTeamId.get(player.teamId);
          if (!spawnTileId) throw new Error(`Team ${player.teamId} has no spawn`);
          await tx.civilizationGamePlayer.update({
            where: { id: player.id },
            data: {
              initialTileId: spawnTileId,
              spawnTileId,
              currentTileId: spawnTileId,
              actionPointUnits,
              lastActionPointUpdateAt: now,
            },
          });
        }
        return players.length;
      });
  }

  updateTile(
    tileId: string,
    data: Prisma.CivilizationTileUncheckedUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationTile.update({ where: { id: tileId }, data });
  }

  updateBuilding(
    buildingId: string,
    data: Prisma.CivilizationBuildingUncheckedUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationBuilding.update({ where: { id: buildingId }, data });
  }

  updateTower(
    towerId: string,
    data: Prisma.CivilizationTowerUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationTower.update({ where: { id: towerId }, data });
  }

  createTower(data: Prisma.CivilizationTowerUncheckedCreateInput, tx: CivilizationTransaction) {
    return tx.civilizationTower.create({ data });
  }

  deleteTower(towerId: string, tx: CivilizationTransaction) {
    return tx.civilizationTower.delete({ where: { id: towerId } });
  }

  updateTeamResource(
    resourceId: string,
    data: Prisma.CivilizationTeamResourceUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationTeamResource.update({ where: { id: resourceId }, data });
  }

  updateAttributeResource(
    resourceId: string,
    data: Prisma.CivilizationTeamAttributeResourceUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationTeamAttributeResource.update({ where: { id: resourceId }, data });
  }

  updateTeam(
    teamId: string,
    data: Prisma.CivilizationTeamUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationTeam.update({ where: { id: teamId }, data });
  }

  async createSnapshot(
    gameId: string,
    snapshotType: CivilizationGameSnapshotType,
    state: unknown,
    tx: CivilizationTransaction,
  ) {
    const stateJson = this.json(state);
    const existing = await tx.civilizationGameSnapshot.findUnique({
      where: { gameId_snapshotType: { gameId, snapshotType } },
    });
    if (existing) {
      if (this.canonicalJson(existing.stateJson) !== this.canonicalJson(stateJson)) {
        throw new Error(
          `Civilization ${snapshotType} snapshot for game ${gameId} already exists with different state`,
        );
      }
      return existing;
    }
    return tx.civilizationGameSnapshot.create({
      data: { gameId, snapshotType, stateJson },
    });
  }

  findRewardDistribution(
    gameId: string,
    playerId: string,
    resourceType: 'GOLD' | 'ATTRIBUTE',
    attributeKey: CivilizationAttributeKey | null,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationRewardDistribution.findFirst({
      where: { gameId, playerId, resourceType, attributeKey },
    });
  }

  createRewardDistribution(
    data: Prisma.CivilizationRewardDistributionUncheckedCreateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationRewardDistribution.create({ data });
  }

  createRewardClaim(
    data: Prisma.CivilizationRewardClaimUncheckedCreateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationRewardClaim.create({ data });
  }

  findRewardClaim(gameId: string, playerId: string, tx: CivilizationTransaction) {
    return tx.civilizationRewardClaim.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
    });
  }

  updateRewardClaim(
    claimId: string,
    data: Prisma.CivilizationRewardClaimUncheckedUpdateInput,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationRewardClaim.update({ where: { id: claimId }, data });
  }

  listPendingRewardDistributions(gameId: string, playerId: string, tx: CivilizationTransaction) {
    return tx.civilizationRewardDistribution.findMany({
      where: { gameId, playerId, appliedAt: null },
      orderBy: [{ resourceType: 'asc' }, { attributeKey: 'asc' }],
    });
  }

  markRewardDistributionApplied(
    distributionId: string,
    appliedAt: Date,
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationRewardDistribution.update({
      where: { id: distributionId },
      data: { appliedAt },
    });
  }

  incrementAccountReward(
    userId: string,
    key: 'balance' | CivilizationAttributeKey,
    amount: number,
    tx: CivilizationTransaction,
  ) {
    return tx.account.update({ where: { id: userId }, data: { [key]: { increment: amount } } });
  }

  async hasDateOverlap(
    startAt: Date,
    endAt: Date,
    excludedGameId: string | null,
    tx: CivilizationTransaction,
  ): Promise<boolean> {
    const count = await tx.civilizationGame.count({
      where: {
        ...(excludedGameId ? { id: { not: excludedGameId } } : {}),
        status: { in: [CivilizationGameStatus.SCHEDULED, CivilizationGameStatus.ACTIVE] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    return count > 0;
  }

  findGamesForReconciliation() {
    return this.prisma.civilizationGame.findMany({
      where: {
        OR: [
          { status: CivilizationGameStatus.SCHEDULED },
          { status: CivilizationGameStatus.ACTIVE },
        ],
      },
      select: { id: true, status: true, startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });
  }

  findTowersForReconciliation() {
    return this.prisma.civilizationTower.findMany({
      where: {
        status: CivilizationTowerStatus.UNDER_CONSTRUCTION,
        game: {
          status: {
            in: [CivilizationGameStatus.SCHEDULED, CivilizationGameStatus.ACTIVE],
          },
        },
      },
      select: { id: true, gameId: true, constructionCompletesAt: true },
    });
  }

  async findExistingAccountIds(
    userIds: string[],
    tx: CivilizationTransaction,
  ): Promise<Set<string>> {
    const accounts = await tx.account.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    return new Set(accounts.map((account) => account.id));
  }

  async insertActivePlayer(
    input: {
      gameId: string;
      teamId: string;
      userId: string;
      spawnTileId: string;
      actionPointUnits: number;
      now: Date;
    },
    tx: CivilizationTransaction,
  ) {
    return tx.civilizationGamePlayer.create({
      data: {
        gameId: input.gameId,
        teamId: input.teamId,
        userId: input.userId,
        initialTileId: input.spawnTileId,
        spawnTileId: input.spawnTileId,
        currentTileId: input.spawnTileId,
        actionPointUnits: input.actionPointUnits,
        lastActionPointUpdateAt: input.now,
        joinedAt: input.now,
      },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });
  }

  private async insertConfiguration(
    gameId: string,
    input: ReplaceCivilizationConfigurationInput,
    tx: CivilizationTransaction,
  ): Promise<void> {
    const teamsBySide = new Map<CivilizationTeamSide, { id: string }>();
    for (const team of input.teams) {
      const created = await tx.civilizationTeam.create({
        data: {
          gameId,
          name: team.name,
          color: team.color,
          visualIdentifier: team.visualKey,
          side: team.side as CivilizationTeamSide,
        },
      });
      teamsBySide.set(created.side, created);
    }

    const tilesByCoordinate = new Map<string, { id: string }>();
    for (const tile of input.map.tiles) {
      const owner = tile.ownerTeamSide
        ? teamsBySide.get(tile.ownerTeamSide as CivilizationTeamSide)
        : undefined;
      const created = await tx.civilizationTile.create({
        data: {
          gameId,
          q: tile.q,
          r: tile.r,
          terrainType: tile.terrainType as CivilizationTerrainType,
          ownerTeamId: owner?.id ?? null,
        },
      });
      tilesByCoordinate.set(this.coordinateKey(tile), created);
    }

    const spawnTileBySide = new Map<CivilizationTeamSide, { id: string }>();
    for (const spawn of input.map.spawns) {
      const team = teamsBySide.get(spawn.teamSide as CivilizationTeamSide)!;
      const tile = tilesByCoordinate.get(this.coordinateKey(spawn))!;
      spawnTileBySide.set(spawn.teamSide as CivilizationTeamSide, tile);
      await tx.civilizationSpawnPoint.create({
        data: { gameId, teamId: team.id, tileId: tile.id },
      });
    }

    for (const building of input.map.buildings) {
      const tile = tilesByCoordinate.get(this.coordinateKey(building))!;
      const owner = building.ownerTeamSide
        ? teamsBySide.get(building.ownerTeamSide as CivilizationTeamSide)
        : undefined;
      const buildingType = building.type as CivilizationBuildingType;
      const incomePerHour =
        building.incomePerHour ??
        this.defaultBuildingIncome(buildingType, building.attributeKey, input.settings);
      await tx.civilizationBuilding.create({
        data: {
          gameId,
          tileId: tile.id,
          buildingType,
          attributeKey: (building.attributeKey as CivilizationAttributeKey | undefined) ?? null,
          ownerTeamId: owner?.id ?? null,
          captureRequiredUnits:
            building.captureRequiredUnits ??
            (buildingType === CivilizationBuildingType.TOWN_HALL
              ? input.settings.townHall.captureRequiredUnits
              : input.settings.buildingCapture.requiredUnits),
          incomePerHour,
          status: CivilizationBuildingStatus.ACTIVE,
        },
      });
      if (buildingType === CivilizationBuildingType.TOWN_HALL && owner) {
        await tx.civilizationTeam.update({
          where: { id: owner.id },
          data: { townHallTileId: tile.id },
        });
      }
    }

    for (const configuredTeam of input.teams) {
      const team = teamsBySide.get(configuredTeam.side as CivilizationTeamSide)!;
      for (const userId of configuredTeam.playerIds) {
        await tx.civilizationGamePlayer.create({
          data: {
            gameId,
            teamId: team.id,
            userId,
            initialTileId: spawnTileBySide.get(configuredTeam.side as CivilizationTeamSide)!.id,
            spawnTileId: spawnTileBySide.get(configuredTeam.side as CivilizationTeamSide)!.id,
            currentTileId: spawnTileBySide.get(configuredTeam.side as CivilizationTeamSide)!.id,
            actionPointUnits: input.settings.actionPoints.initialUnits,
            lastActionPointUpdateAt: input.startAt,
          },
        });
      }
    }

    for (const tower of input.map.towers) {
      const team = teamsBySide.get(tower.teamSide as CivilizationTeamSide)!;
      const tile = tilesByCoordinate.get(this.coordinateKey(tower))!;
      const status = (tower.status ?? CivilizationTowerStatus.ACTIVE) as CivilizationTowerStatus;
      await tx.civilizationTower.create({
        data: {
          gameId,
          teamId: team.id,
          tileId: tile.id,
          status,
          workKind:
            status === CivilizationTowerStatus.UNDER_CONSTRUCTION
              ? CivilizationTowerWorkKind.BUILD
              : null,
          protectionRadius: tower.protectionRadius ?? input.settings.tower.protectionRadius,
          hitPoints: status === CivilizationTowerStatus.DESTROYED ? 0 : 100,
          maximumHitPoints: 100,
          constructionStartedAt: input.startAt,
          constructionCompletesAt:
            status === CivilizationTowerStatus.UNDER_CONSTRUCTION
              ? new Date(
                  input.startAt.getTime() + input.settings.tower.constructionMinutes * 60_000,
                )
              : null,
          destroyedAt: status === CivilizationTowerStatus.DESTROYED ? input.startAt : null,
        },
      });
    }

    for (const team of teamsBySide.values()) {
      await tx.civilizationTeamResource.create({
        data: { gameId, teamId: team.id, lastSettledAt: input.startAt },
      });
      for (const attributeKey of Object.values(CivilizationAttributeKey)) {
        await tx.civilizationTeamAttributeResource.create({
          data: { gameId, teamId: team.id, attributeKey, lastSettledAt: input.startAt },
        });
      }
    }
  }

  private defaultBuildingIncome(
    buildingType: CivilizationBuildingType,
    attributeKey: string | null | undefined,
    settings: CivilizationSettings,
  ): string {
    if (buildingType === CivilizationBuildingType.GOLD_BUILDING) {
      return settings.goldBuildingIncomePerHour;
    }
    if (buildingType === CivilizationBuildingType.ATTRIBUTE_BUILDING && attributeKey) {
      return settings.attributeBuildingIncomePerHour[
        attributeKey as keyof typeof settings.attributeBuildingIncomePerHour
      ];
    }
    return '0';
  }

  private coordinateKey(coordinate: { q: number; r: number }): string {
    return `${coordinate.q}:${coordinate.r}`;
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private canonicalJson(value: unknown): string {
    const canonicalize = (current: unknown): unknown => {
      if (Array.isArray(current)) return current.map((item) => canonicalize(item));
      if (typeof current !== 'object' || current === null) return current;
      return Object.fromEntries(
        Object.entries(current as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, canonicalize(nested)]),
      );
    };
    return JSON.stringify(canonicalize(value));
  }

  private client(tx?: CivilizationTransaction): PrismaService | CivilizationTransaction {
    return tx ?? this.prisma;
  }
}
