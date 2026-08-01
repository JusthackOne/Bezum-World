import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CivilizationAdminActionType,
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameSnapshotType,
  CivilizationGameStatus,
  CivilizationTerrainType,
  CivilizationTowerStatus,
} from '@prisma/client';

import { CivilizationCompletionService } from './civilization-completion.service';
import {
  type CivilizationConfigurationValidation,
  CivilizationConfigurationService,
} from './civilization-configuration.service';
import { CIVILIZATION_ERROR_CODES, CivilizationException } from './civilization.errors';
import { CivilizationQueryService } from './civilization-query.service';
import { CivilizationRuntimeService } from './civilization-runtime.service';
import { CivilizationScheduleService } from './civilization-schedule.service';
import { serializeCivilizationSnapshot } from './civilization-snapshot';
import { CivilizationSettlementService } from './civilization-settlement.service';
import { defaultCivilizationSettings, parseCivilizationSettings } from './domain';
import type {
  AddActiveCivilizationPlayerDto,
  CreateCivilizationGameDto,
  UpdateCivilizationGameDto,
} from './dto';
import {
  CivilizationRepository,
  type CivilizationAdminListRecord,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from './repositories';

@Injectable()
export class CivilizationAdminService {
  constructor(
    private readonly repository: CivilizationRepository,
    private readonly configurationService: CivilizationConfigurationService,
    private readonly settlementService: CivilizationSettlementService,
    private readonly completionService: CivilizationCompletionService,
    private readonly queryService: CivilizationQueryService,
    private readonly scheduleService: CivilizationScheduleService,
    private readonly runtime: CivilizationRuntimeService,
  ) {}

  async listGames(
    page: number,
    limit: number,
    search?: string,
    status?: CivilizationGameStatus,
  ): Promise<unknown> {
    const result = await this.repository.listForAdmin(page, limit, search, status);
    return {
      items: result.items.map((state) => this.toAdminGameSummary(state)),
      total: result.total,
      page,
      limit,
    };
  }

  async getGame(gameId: string): Promise<unknown> {
    const state = await this.requireGame(gameId);
    return this.toAdminGame(state);
  }

  async createGame(
    adminId: string,
    idempotencyKey: string,
    input: CreateCivilizationGameDto,
  ): Promise<unknown> {
    const normalized = {
      ...input,
      settings:
        input.settings ?? (defaultCivilizationSettings as unknown as Record<string, unknown>),
    };
    this.assertValid(this.configurationService.validate(normalized));
    const settings = parseCivilizationSettings(normalized.settings);

    const requestHash = this.requestHash(input);
    return this.repository.transaction(async (tx) => {
      const replay = await this.beginAdminMutation(
        adminId,
        CivilizationAdminActionType.GAME_CREATED,
        idempotencyKey,
        requestHash,
        tx,
      );
      if (replay.found) return replay.result;
      const userIds = input.teams.flatMap((team) => team.playerIds);
      await this.assertAccountsExist(userIds, tx);
      const created = await this.repository.createConfiguredGame(
        adminId,
        {
          name: input.name.trim(),
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          teams: input.teams,
          map: input.map,
          settings,
        },
        tx,
      );
      await this.repository.createEvent(
        {
          gameId: created.id,
          eventType: CivilizationEventType.GAME_CREATED,
          payload: { adminId, name: created.name },
        },
        tx,
      );
      for (const player of created.players) {
        await this.repository.createEvent(
          {
            gameId: created.id,
            eventType: CivilizationEventType.PLAYER_ASSIGNED,
            payload: {
              playerId: player.id,
              userId: player.userId,
              teamId: player.teamId,
              initialTileId: player.initialTileId,
              spawnTileId: player.spawnTileId,
            },
          },
          tx,
        );
      }
      const response = this.toAdminGame(created);
      await this.repository.createAudit(
        {
          gameId: created.id,
          adminId,
          action: CivilizationAdminActionType.GAME_CREATED,
          afterData: this.toAuditState(created),
          metadata: { idempotencyKey, requestHash, result: response },
        },
        tx,
      );
      return response;
    });
  }

  async updateGame(
    gameId: string,
    adminId: string,
    idempotencyKey: string,
    patch: UpdateCivilizationGameDto,
  ): Promise<unknown> {
    const requestHash = this.requestHash({ gameId, patch });
    const transactionResult = await this.withScheduleConstraintMapping(() =>
      this.repository.transaction(async (tx) => {
        await this.repository.lockGameState(gameId, tx);
        const replay = await this.beginAdminMutation(
          adminId,
          CivilizationAdminActionType.GAME_UPDATED,
          idempotencyKey,
          requestHash,
          tx,
        );
        if (replay.found) {
          const replayState = await this.repository.findStateById(gameId, tx);
          return {
            response: replay.result,
            reschedule: this.scheduleDescriptor(replayState),
          };
        }
        const before = await this.repository.findStateById(gameId, tx);
        this.assertEditable(before);
        if (
          before.status === CivilizationGameStatus.SCHEDULED &&
          before.startAt.getTime() <= this.runtime.now().getTime()
        ) {
          throw new CivilizationException(
            CIVILIZATION_ERROR_CODES.GAME_IMMUTABLE,
            'A scheduled game cannot be edited after its configured start time',
          );
        }
        const current = this.toConfiguration(before);
        const merged: CreateCivilizationGameDto = {
          name: patch.name ?? current.name,
          startAt: patch.startAt ?? current.startAt,
          endAt: patch.endAt ?? current.endAt,
          teams: patch.teams ?? current.teams,
          map: patch.map ?? current.map,
          settings: patch.settings ?? current.settings,
        };
        this.assertValid(this.configurationService.validate(merged));
        const settings = parseCivilizationSettings(merged.settings);
        if (before.status === CivilizationGameStatus.SCHEDULED) {
          await this.repository.acquireScheduleLock(tx);
          if (
            await this.repository.hasDateOverlap(
              new Date(merged.startAt),
              new Date(merged.endAt),
              gameId,
              tx,
            )
          ) {
            throw new CivilizationException(
              CIVILIZATION_ERROR_CODES.GAME_DATE_OVERLAP,
              'Civilization schedule overlaps another scheduled or active game',
            );
          }
        }
        await this.assertAccountsExist(
          merged.teams.flatMap((team) => team.playerIds),
          tx,
        );
        const next = await this.repository.replaceConfiguration(
          gameId,
          {
            name: merged.name.trim(),
            startAt: new Date(merged.startAt),
            endAt: new Date(merged.endAt),
            teams: merged.teams,
            map: merged.map,
            settings,
          },
          tx,
        );
        for (const player of next.players) {
          await this.repository.createEvent(
            {
              gameId,
              eventType: CivilizationEventType.PLAYER_ASSIGNED,
              payload: {
                playerId: player.id,
                userId: player.userId,
                teamId: player.teamId,
                initialTileId: player.initialTileId,
                spawnTileId: player.spawnTileId,
                source: 'ADMIN_CONFIGURATION_UPDATE',
              },
            },
            tx,
          );
        }
        const response = this.toAdminGame(next);
        await this.repository.createAudit(
          {
            gameId,
            adminId,
            action: CivilizationAdminActionType.GAME_UPDATED,
            beforeData: this.toAuditState(before),
            afterData: this.toAuditState(next),
            metadata: { idempotencyKey, requestHash, result: response },
          },
          tx,
        );
        return {
          response,
          reschedule:
            before.status === CivilizationGameStatus.SCHEDULED
              ? {
                  startAt: next.startAt,
                  endAt: next.endAt,
                  towerJobs: this.towerJobs(next),
                }
              : null,
        };
      }),
    );
    if (transactionResult.reschedule) {
      await this.scheduleService.scheduleGame(
        gameId,
        transactionResult.reschedule.startAt,
        transactionResult.reschedule.endAt,
      );
      await this.scheduleTowerJobs(gameId, transactionResult.reschedule.towerJobs);
    }
    return transactionResult.response;
  }

  async validateGame(gameId: string): Promise<unknown> {
    const state = await this.requireGame(gameId);
    const validation = this.configurationService.validate(this.toConfiguration(state));
    const overlaps = await this.repository.transaction((tx) =>
      this.repository.hasDateOverlap(state.startAt, state.endAt, gameId, tx),
    );
    if (overlaps) {
      validation.issues.push({
        code: CIVILIZATION_ERROR_CODES.GAME_DATE_OVERLAP,
        message: 'Civilization schedule overlaps another scheduled or active game',
        path: 'startAt',
      });
      validation.valid = false;
    }
    return validation;
  }

  async scheduleGame(gameId: string, adminId: string, idempotencyKey: string): Promise<unknown> {
    const requestHash = this.requestHash({ gameId });
    const transactionResult = await this.withScheduleConstraintMapping(() =>
      this.repository.transaction(async (tx) => {
        await this.repository.lockGameState(gameId, tx);
        const replay = await this.beginAdminMutation(
          adminId,
          CivilizationAdminActionType.GAME_SCHEDULED,
          idempotencyKey,
          requestHash,
          tx,
        );
        if (replay.found) {
          const replayState = await this.repository.findStateById(gameId, tx);
          return {
            response: replay.result,
            schedule: this.scheduleDescriptor(replayState),
          };
        }
        const state = await this.repository.findStateById(gameId, tx);
        if (!state) this.notFound();
        if (
          state.status !== CivilizationGameStatus.DRAFT &&
          state.status !== CivilizationGameStatus.SCHEDULED
        ) {
          throw new CivilizationException(
            CIVILIZATION_ERROR_CODES.GAME_IMMUTABLE,
            'Only draft or scheduled games can be scheduled',
          );
        }
        this.assertValid(this.configurationService.validate(this.toConfiguration(state)));
        await this.repository.acquireScheduleLock(tx);
        if (await this.repository.hasDateOverlap(state.startAt, state.endAt, gameId, tx)) {
          throw new CivilizationException(
            CIVILIZATION_ERROR_CODES.GAME_DATE_OVERLAP,
            'Civilization schedule overlaps another scheduled or active game',
          );
        }
        const now = this.runtime.now();
        if (state.endAt.getTime() <= now.getTime()) {
          throw new CivilizationException(
            CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
            'A game cannot be scheduled after its end date',
          );
        }
        await this.repository.updateGame(
          gameId,
          { status: CivilizationGameStatus.SCHEDULED, stateVersion: { increment: 1 } },
          tx,
        );
        await this.repository.createEvent(
          {
            gameId,
            eventType: CivilizationEventType.GAME_SCHEDULED,
            payload: { startAt: state.startAt.toISOString(), endAt: state.endAt.toISOString() },
          },
          tx,
        );
        const next = (await this.repository.findStateById(gameId, tx))!;
        const response = this.toAdminGame(next);
        await this.repository.createAudit(
          {
            gameId,
            adminId,
            action: CivilizationAdminActionType.GAME_SCHEDULED,
            beforeData: { status: state.status },
            afterData: { status: CivilizationGameStatus.SCHEDULED },
            metadata: { idempotencyKey, requestHash, result: response },
          },
          tx,
        );
        return {
          response,
          schedule: {
            startAt: next.startAt,
            endAt: next.endAt,
            towerJobs: this.towerJobs(next),
          },
        };
      }),
    );
    if (transactionResult.schedule) {
      await this.scheduleService.scheduleGame(
        gameId,
        transactionResult.schedule.startAt,
        transactionResult.schedule.endAt,
      );
      await this.scheduleTowerJobs(gameId, transactionResult.schedule.towerJobs);
    }
    return transactionResult.response;
  }

  async addPlayer(
    gameId: string,
    adminId: string,
    idempotencyKey: string,
    input: AddActiveCivilizationPlayerDto,
  ): Promise<unknown> {
    const stateAtRequest = await this.repository.findStateById(gameId);
    const requestTime = this.runtime.now();
    if (
      stateAtRequest?.status === CivilizationGameStatus.ACTIVE &&
      requestTime.getTime() >= stateAtRequest.endAt.getTime()
    ) {
      await this.completionService.completeGame(
        gameId,
        CivilizationCompletionReason.END_TIME_REACHED,
      );
    }
    const requestHash = this.requestHash({ gameId, input });
    return this.repository.transaction(async (tx) => {
      await this.repository.lockGameState(gameId, tx);
      const replay = await this.beginAdminMutation(
        adminId,
        CivilizationAdminActionType.PLAYER_ADDED_AFTER_START,
        idempotencyKey,
        requestHash,
        tx,
      );
      if (replay.found) return replay.result;
      const current = await this.repository.findStateById(gameId, tx);
      if (!current) this.notFound();
      if (current.status !== CivilizationGameStatus.ACTIVE) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.GAME_NOT_ACTIVE,
          'Players can be added through this endpoint only after the game starts',
        );
      }
      const now = this.runtime.now();
      if (now.getTime() >= current.endAt.getTime()) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.GAME_NOT_ACTIVE,
          'Players cannot be added after the configured game end time',
        );
      }
      if (current.players.some((player) => player.userId === input.userId)) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
          'The user is already assigned to this game',
        );
      }
      const team = current.teams.find((candidate) => candidate.id === input.teamId);
      const spawn = current.spawnPoint;
      const tile = spawn
        ? current.tiles.find((candidate) => candidate.id === spawn.tileId)
        : undefined;
      if (!team || !spawn || !tile || tile.terrainType === CivilizationTerrainType.MOUNTAIN) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
          'The shared game spawn is invalid',
        );
      }
      if (
        current.buildings.some((building) => building.tileId === tile.id) ||
        current.towers.some(
          (tower) => tower.tileId === tile.id && tower.status !== CivilizationTowerStatus.CANCELLED,
        )
      ) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
          'The shared game spawn must remain free of structures',
        );
      }
      await this.assertAccountsExist([input.userId], tx);
      const settings = parseCivilizationSettings(current.settingsJson);
      const player = await this.repository.insertActivePlayer(
        {
          gameId,
          teamId: input.teamId,
          userId: input.userId,
          spawnTileId: tile.id,
          actionPointUnits: settings.actionPoints.initialUnits,
          now,
        },
        tx,
      );
      await this.repository.createEvent(
        {
          gameId,
          teamId: input.teamId,
          actorPlayerId: player.id,
          tileId: tile.id,
          eventType: CivilizationEventType.PLAYER_ADDED_AFTER_START,
          payload: {
            userId: input.userId,
            initialActionPointUnits: settings.actionPoints.initialUnits,
          },
        },
        tx,
      );
      await this.repository.updateGame(gameId, { stateVersion: { increment: 1 } }, tx);
      const next = (await this.repository.findStateById(gameId, tx))!;
      const response = this.toAdminGame(next);
      await this.repository.createAudit(
        {
          gameId,
          adminId,
          action: CivilizationAdminActionType.PLAYER_ADDED_AFTER_START,
          afterData: {
            playerId: player.id,
            userId: input.userId,
            teamId: input.teamId,
            spawnTileId: tile.id,
          },
          metadata: { idempotencyKey, requestHash, result: response },
        },
        tx,
      );
      return response;
    });
  }

  async cancelGame(gameId: string, adminId: string, idempotencyKey: string): Promise<unknown> {
    const requestHash = this.requestHash({ gameId });
    return this.repository.transaction(async (tx) => {
      await this.repository.lockGameState(gameId, tx);
      const replay = await this.beginAdminMutation(
        adminId,
        CivilizationAdminActionType.GAME_CANCELLED,
        idempotencyKey,
        requestHash,
        tx,
      );
      if (replay.found) return replay.result;
      const current = await this.repository.findStateById(gameId, tx);
      if (!current) this.notFound();
      if (
        current.status === CivilizationGameStatus.COMPLETED ||
        current.status === CivilizationGameStatus.CANCELLED
      ) {
        const response = this.toAdminGame(current);
        await this.repository.createAudit(
          {
            gameId,
            adminId,
            action: CivilizationAdminActionType.GAME_CANCELLED,
            beforeData: { status: current.status },
            afterData: { status: current.status, noOp: true },
            metadata: { idempotencyKey, requestHash, result: response },
          },
          tx,
        );
        return response;
      }
      const now = this.runtime.now();
      await this.settlementService.settleAllResources(current, now, tx);
      if (current.status === CivilizationGameStatus.ACTIVE) {
        const settings = parseCivilizationSettings(current.settingsJson);
        for (const player of current.players) {
          await this.settlementService.settlePlayer(player, settings, now, tx);
        }
      }
      await this.repository.updateGame(
        gameId,
        {
          status: CivilizationGameStatus.CANCELLED,
          completionReason: CivilizationCompletionReason.ADMIN_CANCELLED,
          completedAt: now,
          winnerTeam: { disconnect: true },
          stateVersion: { increment: 1 },
        },
        tx,
      );
      await this.repository.createEvent(
        {
          gameId,
          eventType: CivilizationEventType.GAME_CANCELLED,
          payload: { adminId, cancelledAt: now.toISOString() },
        },
        tx,
      );
      const cancelled = (await this.repository.findStateById(gameId, tx))!;
      await this.repository.createSnapshot(
        gameId,
        CivilizationGameSnapshotType.FINAL,
        serializeCivilizationSnapshot(cancelled),
        tx,
      );
      const response = this.toAdminGame(cancelled);
      await this.repository.createAudit(
        {
          gameId,
          adminId,
          action: CivilizationAdminActionType.GAME_CANCELLED,
          beforeData: { status: current.status },
          afterData: { status: CivilizationGameStatus.CANCELLED },
          metadata: { idempotencyKey, requestHash, result: response },
        },
        tx,
      );
      return response;
    });
  }

  async forceCompleteGame(
    gameId: string,
    adminId: string,
    idempotencyKey: string,
    winnerTeamId: string | null,
  ): Promise<unknown> {
    const requestHash = this.requestHash({ gameId, winnerTeamId });
    return this.repository.transaction(async (tx) => {
      await this.repository.lockGameState(gameId, tx);
      const replay = await this.beginAdminMutation(
        adminId,
        CivilizationAdminActionType.GAME_FORCE_COMPLETED,
        idempotencyKey,
        requestHash,
        tx,
      );
      if (replay.found) return replay.result;
      const before = await this.repository.findStateById(gameId, tx);
      if (!before) this.notFound();
      if (before.status !== CivilizationGameStatus.ACTIVE) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.GAME_NOT_ACTIVE,
          'Only an active Civilization game can be force-completed',
        );
      }
      if (winnerTeamId && !before.teams.some((team) => team.id === winnerTeamId)) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
          'Winner must be a team in this game',
        );
      }
      const completed = await this.completionService.completeInTransaction(
        gameId,
        CivilizationCompletionReason.ADMIN_FORCE_COMPLETED,
        winnerTeamId,
        this.runtime.now(),
        tx,
      );
      const response = this.toAdminGame(completed);
      await this.repository.createAudit(
        {
          gameId,
          adminId,
          action: CivilizationAdminActionType.GAME_FORCE_COMPLETED,
          beforeData: { status: before.status },
          afterData: { status: completed.status, winnerTeamId: completed.winnerTeamId },
          metadata: { idempotencyKey, requestHash, result: response },
        },
        tx,
      );
      return response;
    });
  }

  async getAuditLog(gameId: string, page: number, limit: number): Promise<unknown> {
    await this.requireGame(gameId);
    const result = await this.repository.listAudit(gameId, page, limit);
    return {
      items: result.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      total: result.total,
      page,
      limit,
    };
  }

  private async requireGame(gameId: string): Promise<CivilizationStateRecord> {
    const state = await this.repository.findStateById(gameId);
    if (!state) this.notFound();
    return state;
  }

  private async beginAdminMutation(
    adminId: string,
    action: CivilizationAdminActionType,
    idempotencyKey: string,
    requestHash: string,
    tx: CivilizationTransaction,
  ): Promise<{ found: false } | { found: true; result: unknown }> {
    await this.repository.acquireAdminMutationLock(adminId, action, idempotencyKey, tx);
    const existing = await this.repository.findAdminMutation(adminId, action, idempotencyKey, tx);
    if (!existing) return { found: false };
    const metadata = existing.metadata;
    if (!this.isRecord(metadata) || metadata.requestHash !== requestHash) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.ACTION_ALREADY_PROCESSED,
        'Idempotency key was already used with a different request',
      );
    }
    return { found: true, result: metadata.result };
  }

  private requestHash(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.canonicalize(value)))
      .digest('hex');
  }

  private canonicalize(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.canonicalize(item));
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter((entry) => entry[1] !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, this.canonicalize(item)]),
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async withScheduleConstraintMapping<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isScheduleConstraintError(error)) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.GAME_DATE_OVERLAP,
          'Civilization schedule overlaps another scheduled or active game',
        );
      }
      throw error;
    }
  }

  private isScheduleConstraintError(error: unknown): boolean {
    const constraintNames = [
      'civilization_games_non_overlapping_periods_excl',
      'civilization_games_single_active_idx',
    ];
    const visited = new WeakSet<object>();
    const containsConstraint = (value: unknown, depth: number): boolean => {
      if (depth > 6) return false;
      if (typeof value === 'string') {
        return constraintNames.some((constraintName) => value.includes(constraintName));
      }
      if (typeof value !== 'object' || value === null || visited.has(value)) return false;
      visited.add(value);
      if (
        value instanceof Error &&
        constraintNames.some((constraintName) => value.message.includes(constraintName))
      ) {
        return true;
      }
      return Object.values(value).some((nested) => containsConstraint(nested, depth + 1));
    };
    return containsConstraint(error, 0);
  }

  private assertEditable(
    state: CivilizationStateRecord | null,
  ): asserts state is CivilizationStateRecord {
    if (!state) this.notFound();
    if (
      state.status !== CivilizationGameStatus.DRAFT &&
      state.status !== CivilizationGameStatus.SCHEDULED
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.GAME_IMMUTABLE,
        'Civilization configuration is immutable after the game starts',
      );
    }
  }

  private assertValid(validation: CivilizationConfigurationValidation): void {
    if (!validation.valid) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
        'Civilization game configuration is invalid',
        400,
        validation.issues,
      );
    }
  }

  private async assertAccountsExist(
    userIds: string[],
    tx: Parameters<CivilizationRepository['findExistingAccountIds']>[1],
  ): Promise<void> {
    const existing = await this.repository.findExistingAccountIds(userIds, tx);
    const missing = userIds.filter((userId) => !existing.has(userId));
    if (missing.length > 0) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
        'One or more assigned users do not exist',
        400,
        { missingUserIds: missing },
      );
    }
  }

  private toAdminGame(state: CivilizationStateRecord): Record<string, unknown> {
    const configuration = this.toConfiguration(state);
    return {
      id: state.id,
      name: state.name,
      status: state.status,
      startAt: state.startAt.toISOString(),
      endAt: state.endAt.toISOString(),
      completedAt: state.completedAt?.toISOString() ?? null,
      winnerTeamId: state.winnerTeamId,
      completionReason: state.completionReason,
      teams: configuration.teams,
      map: configuration.map,
      settings: configuration.settings,
      playerCount: state.players.length,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      gameState: this.queryService.toState(state, '', this.runtime.now()),
    };
  }

  private toAdminGameSummary(state: CivilizationAdminListRecord): Record<string, unknown> {
    const teams = state.teams.map((team) => ({
      id: team.id,
      side: team.side,
      name: team.name,
      color: team.color,
      visualKey: team.visualIdentifier ?? team.side.toLowerCase(),
      playerCount: team._count.players,
      finalScore: team.finalScore?.toString() ?? null,
      finalGold: null,
      finalAttributes: null,
    }));
    const winner = state.winnerTeamId
      ? (teams.find((team) => team.id === state.winnerTeamId) ?? null)
      : null;
    return {
      id: state.id,
      name: state.name,
      status: state.status,
      startAt: state.startAt.toISOString(),
      endAt: state.endAt.toISOString(),
      completedAt: state.completedAt?.toISOString() ?? null,
      winnerTeamId: state.winnerTeamId,
      completionReason: state.completionReason,
      winnerTeam: winner ? { id: winner.id, name: winner.name, color: winner.color } : null,
      teams,
      playerCount: teams.reduce((total, team) => total + team.playerCount, 0),
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
    };
  }

  private toConfiguration(state: CivilizationStateRecord): CreateCivilizationGameDto {
    const teamById = new Map(state.teams.map((team) => [team.id, team]));
    const tileById = new Map(state.tiles.map((tile) => [tile.id, tile]));
    return {
      name: state.name,
      startAt: state.startAt.toISOString(),
      endAt: state.endAt.toISOString(),
      settings: parseCivilizationSettings(state.settingsJson) as unknown as Record<string, unknown>,
      teams: state.teams.map((team) => ({
        id: team.id,
        side: team.side,
        name: team.name,
        color: team.color,
        visualKey: team.visualIdentifier ?? team.side.toLowerCase(),
        playerIds: state.players
          .filter((player) => player.teamId === team.id)
          .map((player) => player.userId),
      })),
      map: {
        tiles: state.tiles.map((tile) => ({
          q: tile.q,
          r: tile.r,
          terrainType: tile.terrainType,
          ownerTeamSide: tile.ownerTeamId ? (teamById.get(tile.ownerTeamId)?.side ?? null) : null,
        })),
        spawn: (() => {
          const tile = tileById.get(state.spawnPoint!.tileId)!;
          return { q: tile.q, r: tile.r };
        })(),
        buildings: state.buildings.map((building) => {
          const tile = tileById.get(building.tileId)!;
          return {
            id: building.id,
            q: tile.q,
            r: tile.r,
            type: building.buildingType,
            attributeKey: building.attributeKey,
            ownerTeamSide: building.ownerTeamId
              ? (teamById.get(building.ownerTeamId)?.side ?? null)
              : null,
            captureRequiredUnits: building.captureRequiredUnits,
            incomePerHour: building.incomePerHour.toString(),
          };
        }),
        towers: state.towers.map((tower) => {
          const tile = tileById.get(tower.tileId)!;
          return {
            q: tile.q,
            r: tile.r,
            teamSide: teamById.get(tower.teamId)!.side,
            status: tower.status,
            protectionRadius: tower.protectionRadius,
          };
        }),
      },
    };
  }

  private toAuditState(state: CivilizationStateRecord): Record<string, unknown> {
    return {
      id: state.id,
      name: state.name,
      status: state.status,
      startAt: state.startAt.toISOString(),
      endAt: state.endAt.toISOString(),
      playerCount: state.players.length,
      tileCount: state.tiles.length,
      buildingCount: state.buildings.length,
      settings: parseCivilizationSettings(state.settingsJson),
    };
  }

  private towerJobs(state: CivilizationStateRecord): Array<{ towerId: string; completesAt: Date }> {
    return state.towers
      .filter(
        (tower) =>
          tower.status === CivilizationTowerStatus.UNDER_CONSTRUCTION &&
          tower.constructionCompletesAt !== null,
      )
      .map((tower) => ({ towerId: tower.id, completesAt: tower.constructionCompletesAt! }));
  }

  private scheduleDescriptor(state: CivilizationStateRecord | null): {
    startAt: Date;
    endAt: Date;
    towerJobs: Array<{ towerId: string; completesAt: Date }>;
  } | null {
    if (
      !state ||
      (state.status !== CivilizationGameStatus.SCHEDULED &&
        state.status !== CivilizationGameStatus.ACTIVE)
    ) {
      return null;
    }
    return {
      startAt: state.startAt,
      endAt: state.endAt,
      towerJobs: this.towerJobs(state),
    };
  }

  private async scheduleTowerJobs(
    gameId: string,
    jobs: Array<{ towerId: string; completesAt: Date }>,
  ): Promise<void> {
    for (const job of jobs) {
      await this.scheduleService.scheduleTower(job.towerId, gameId, job.completesAt);
    }
  }

  private notFound(): never {
    throw new CivilizationException(
      CIVILIZATION_ERROR_CODES.GAME_NOT_FOUND,
      'Civilization game was not found',
      404,
    );
  }
}
