import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CivilizationActionType,
  CivilizationBuildingStatus,
  CivilizationBuildingType,
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameStatus,
  CivilizationTerrainType,
  CivilizationTowerStatus,
  CivilizationTowerWorkKind,
  Prisma,
} from '@prisma/client';

import { CivilizationCompletionService } from './civilization-completion.service';
import { CivilizationConnectivityService } from './civilization-connectivity.service';
import { CIVILIZATION_ERROR_CODES, CivilizationException } from './civilization.errors';
import { CivilizationQueryService } from './civilization-query.service';
import { CivilizationRuntimeService } from './civilization-runtime.service';
import { CivilizationScheduleService } from './civilization-schedule.service';
import { CivilizationSettlementService } from './civilization-settlement.service';
import {
  areHexesAdjacent,
  hexDistance,
  isOnTowerAttackBoundary,
  parseCivilizationSettings,
  towerProtectionAreasOverlap,
  type CivilizationSettings,
} from './domain';
import type {
  AttackCivilizationPlayerDto,
  BuildCivilizationTowerDto,
  CaptureCivilizationBuildingDto,
  CivilizationActionDto,
  CivilizationCatapultActionDto,
  CivilizationRepairActionDto,
  CivilizationTowerActionDto,
  CivilizationTownHallActionDto,
  MoveCivilizationPlayerDto,
} from './dto';
import {
  CivilizationRepository,
  type CivilizationEventRecord,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from './repositories';

interface ActionExecutionContext {
  gameId: string;
  now: Date;
  player: CivilizationStateRecord['players'][number];
  settings: CivilizationSettings;
  state: CivilizationStateRecord;
  tx: CivilizationTransaction;
}

interface ActionMutationResult {
  event: CivilizationEventRecord;
  towerJob?: { towerId: string; gameId: string; completesAt: Date };
}

@Injectable()
export class CivilizationActionsService {
  constructor(
    private readonly repository: CivilizationRepository,
    private readonly settlementService: CivilizationSettlementService,
    private readonly connectivityService: CivilizationConnectivityService,
    private readonly completionService: CivilizationCompletionService,
    private readonly queryService: CivilizationQueryService,
    private readonly scheduleService: CivilizationScheduleService,
    private readonly runtime: CivilizationRuntimeService,
  ) {}

  move(gameId: string, userId: string, input: MoveCivilizationPlayerDto): Promise<unknown> {
    return this.execute(gameId, userId, input, CivilizationActionType.MOVE, (context) =>
      this.moveInTransaction(context, input),
    );
  }

  attackPlayer(
    gameId: string,
    userId: string,
    input: AttackCivilizationPlayerDto,
  ): Promise<unknown> {
    return this.execute(gameId, userId, input, CivilizationActionType.ATTACK_PLAYER, (context) =>
      this.attackPlayerInTransaction(context, input),
    );
  }

  captureBuilding(
    gameId: string,
    userId: string,
    input: CaptureCivilizationBuildingDto,
  ): Promise<unknown> {
    return this.execute(
      gameId,
      userId,
      input,
      CivilizationActionType.CONTRIBUTE_BUILDING_CAPTURE,
      (context) => this.captureBuildingInTransaction(context, input),
    );
  }

  buildTower(gameId: string, userId: string, input: BuildCivilizationTowerDto): Promise<unknown> {
    return this.execute(
      gameId,
      userId,
      input,
      CivilizationActionType.START_TOWER_CONSTRUCTION,
      (context) => this.buildTowerInTransaction(context, input),
    );
  }

  attackTower(gameId: string, userId: string, input: CivilizationTowerActionDto): Promise<unknown> {
    return this.execute(gameId, userId, input, CivilizationActionType.ATTACK_TOWER, (context) =>
      this.attackTowerInTransaction(context, input),
    );
  }

  catapultAttack(
    gameId: string,
    userId: string,
    input: CivilizationCatapultActionDto,
  ): Promise<unknown> {
    return this.execute(gameId, userId, input, CivilizationActionType.CATAPULT_ATTACK, (context) =>
      this.catapultAttackInTransaction(context, input),
    );
  }

  repairTower(
    gameId: string,
    userId: string,
    input: CivilizationRepairActionDto,
  ): Promise<unknown> {
    return this.execute(gameId, userId, input, CivilizationActionType.REPAIR_TOWER, (context) =>
      this.repairTowerInTransaction(context, input),
    );
  }

  captureTownHall(
    gameId: string,
    userId: string,
    input: CivilizationTownHallActionDto,
  ): Promise<unknown> {
    return this.execute(
      gameId,
      userId,
      input,
      CivilizationActionType.CONTRIBUTE_TOWN_HALL_CAPTURE,
      (context) => this.captureTownHallInTransaction(context, input),
    );
  }

  defendTownHall(
    gameId: string,
    userId: string,
    input: CivilizationTownHallActionDto,
  ): Promise<unknown> {
    return this.execute(gameId, userId, input, CivilizationActionType.DEFEND_TOWN_HALL, (context) =>
      this.defendTownHallInTransaction(context, input),
    );
  }

  private async execute(
    gameId: string,
    userId: string,
    input: CivilizationActionDto,
    actionType: CivilizationActionType,
    mutate: (context: ActionExecutionContext) => Promise<ActionMutationResult>,
  ): Promise<unknown> {
    const transactionResult = await this.repository.transaction(async (tx) => {
      await this.repository.lockGameState(gameId, tx);
      let state = await this.repository.findStateById(gameId, tx);
      if (!state) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.GAME_NOT_FOUND,
          'Civilization game was not found',
          404,
        );
      }
      const player = state.players.find((candidate) => candidate.userId === userId);
      if (player) {
        const existing = await this.repository.findAction(gameId, player.id, input.actionId, tx);
        if (existing) {
          if (
            existing.actionType !== actionType ||
            this.requestHash(existing.requestPayload) !== this.requestHash(input)
          ) {
            throw new CivilizationException(
              CIVILIZATION_ERROR_CODES.ACTION_ALREADY_PROCESSED,
              'Action id was already used with a different action or request payload',
            );
          }
          return {
            response: existing.resultPayload,
            towerJob:
              actionType === CivilizationActionType.START_TOWER_CONSTRUCTION ||
              actionType === CivilizationActionType.REPAIR_TOWER
                ? this.towerJobFromStoredResponse(existing.resultPayload, gameId)
                : undefined,
          };
        }
      }

      const now = this.runtime.now();
      if (state.status !== CivilizationGameStatus.ACTIVE) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.GAME_NOT_ACTIVE,
          'Civilization game is not active',
        );
      }
      if (now.getTime() >= state.endAt.getTime()) {
        await this.completionService.completeInTransaction(
          gameId,
          CivilizationCompletionReason.END_TIME_REACHED,
          null,
          state.endAt,
          tx,
        );
        return { expired: true as const };
      }
      if (!player?.isActive) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.PLAYER_NOT_ASSIGNED,
          'The current user is not an active player in this game',
          403,
        );
      }
      const settings = parseCivilizationSettings(state.settingsJson);
      await this.settlementService.settleAllResources(state, now, tx);
      await this.settlementService.settlePlayer(player, settings, now, tx);
      state = (await this.repository.findStateById(gameId, tx))!;
      const settledPlayer = state.players.find((candidate) => candidate.id === player.id)!;
      const mutation = await mutate({ gameId, now, player: settledPlayer, settings, state, tx });
      await this.repository.updateGame(gameId, { stateVersion: { increment: 1 } }, tx);
      const resultingState = (await this.repository.findStateById(gameId, tx))!;
      const response = {
        gameState: this.queryService.toState(resultingState, userId, now),
        event: this.queryService.toEvent(mutation.event),
      };
      await this.repository.createAction(
        {
          gameId,
          playerId: player.id,
          idempotencyKey: input.actionId,
          actionType,
          requestPayload: input,
          resultPayload: response,
        },
        tx,
      );
      return { response, towerJob: mutation.towerJob };
    });

    if ('expired' in transactionResult) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.GAME_NOT_ACTIVE,
        'Civilization game reached its configured end time',
      );
    }
    if (transactionResult.towerJob) {
      await this.scheduleService.scheduleTower(
        transactionResult.towerJob.towerId,
        transactionResult.towerJob.gameId,
        transactionResult.towerJob.completesAt,
      );
    }
    return transactionResult.response;
  }

  private async moveInTransaction(
    context: ActionExecutionContext,
    input: MoveCivilizationPlayerDto,
  ): Promise<ActionMutationResult> {
    const source = this.tile(context.state, context.player.currentTileId);
    const destination = context.state.tiles.find(
      (tile) => tile.q === input.target.q && tile.r === input.target.r,
    );
    if (!destination) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_NOT_FOUND,
        'Target tile does not exist',
        404,
      );
    }
    if (!areHexesAdjacent(source, destination)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_NOT_ADJACENT,
        'A move may cross exactly one adjacent hex',
      );
    }
    if (destination.terrainType === CivilizationTerrainType.MOUNTAIN) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_IMPASSABLE,
        'Mountain tiles are impassable',
      );
    }
    if (
      context.state.buildings.some((building) => building.tileId === destination.id) ||
      context.state.towers.some(
        (tower) =>
          tower.tileId === destination.id &&
          tower.status !== CivilizationTowerStatus.CANCELLED &&
          tower.status !== CivilizationTowerStatus.DESTROYED,
      )
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_STRUCTURE,
        'Interact with the building or tower without moving onto its tile',
      );
    }
    const destinationSpawn = context.state.spawnPoints.find(
      (spawn) => spawn.tileId === destination.id,
    );
    const isOwnTeamSpawn = destinationSpawn?.teamId === context.player.teamId;
    if (destinationSpawn && !isOwnTeamSpawn) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
        "Enemy players cannot enter another team's spawn",
      );
    }
    const occupyingPlayer = !isOwnTeamSpawn
      ? context.state.players.find(
          (candidate) =>
            candidate.id !== context.player.id &&
            candidate.currentTileId === destination.id &&
            candidate.isActive,
        )
      : undefined;
    if (occupyingPlayer) {
      throw new CivilizationException(
        occupyingPlayer.teamId === context.player.teamId
          ? CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_PLAYER
          : CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
        occupyingPlayer.teamId === context.player.teamId
          ? 'Only allied players may share their own team spawn'
          : 'Attack the occupying enemy player instead of moving',
      );
    }
    if (this.isProtectedByEnemyTower(context.state, destination, context.player.teamId)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_PROTECTED_BY_TOWER,
        'An active connected enemy tower protects this tile',
      );
    }

    const cost =
      destination.ownerTeamId === context.player.teamId
        ? context.settings.costs.ownedMoveUnits
        : context.settings.costs.otherMoveUnits;
    await this.spendActionPoints(context.player, cost, context.tx);
    await this.repository.updatePlayer(
      context.player.id,
      { currentTileId: destination.id },
      context.tx,
    );

    const building = context.state.buildings.find(
      (candidate) => candidate.tileId === destination.id,
    );
    const captured = !building && destination.ownerTeamId !== context.player.teamId;
    if (captured) {
      const previousOwnerTeamId = destination.ownerTeamId;
      await this.repository.updateTile(
        destination.id,
        { ownerTeamId: context.player.teamId, isConnected: false },
        context.tx,
      );
      await this.removeCapturedTileTowers(context, destination.id);
      await this.repository.createEvent(
        {
          gameId: context.gameId,
          teamId: context.player.teamId,
          actorPlayerId: context.player.id,
          tileId: destination.id,
          eventType: CivilizationEventType.TILE_CAPTURED,
          payload: { previousOwnerTeamId, ownerTeamId: context.player.teamId },
        },
        context.tx,
      );
      await this.connectivityService.recalculate(context.gameId, context.now, context.tx);
    }

    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: destination.id,
        eventType: CivilizationEventType.PLAYER_MOVED,
        payload: {
          sourceTileId: source.id,
          destinationTileId: destination.id,
          actionPointUnitsSpent: cost,
          tileCaptured: captured,
        },
      },
      context.tx,
    );
    return { event };
  }

  private async attackPlayerInTransaction(
    context: ActionExecutionContext,
    input: AttackCivilizationPlayerDto,
  ): Promise<ActionMutationResult> {
    const defender = context.state.players.find(
      (candidate) => candidate.id === input.targetPlayerId && candidate.isActive,
    );
    if (!defender || defender.teamId === context.player.teamId) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.INVALID_PLAYER_TARGET,
        'Target must be an active enemy player',
      );
    }
    const attackerTile = this.tile(context.state, context.player.currentTileId);
    const defenderTile = this.tile(context.state, defender.currentTileId);
    if (!areHexesAdjacent(attackerTile, defenderTile)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.INVALID_PLAYER_TARGET,
        'Enemy player must occupy an adjacent tile',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.costs.attackPlayerUnits,
      context.tx,
    );
    const randomRoll = this.runtime.random();
    const attackerWon = randomRoll < context.settings.combat.attackerWinPercent / 100;
    let attackerMoved = false;
    let respawnTileId: string | null = null;

    if (attackerWon) {
      const respawn = context.state.tiles.find((tile) => tile.id === defender.spawnTileId);
      if (!respawn) {
        throw new CivilizationException(
          CIVILIZATION_ERROR_CODES.INVALID_GAME_CONFIGURATION,
          "The defeated player's team has no valid spawn tile",
        );
      }
      respawnTileId = respawn.id;
      await this.repository.updatePlayer(defender.id, { currentTileId: respawn.id }, context.tx);

      const otherDefendersRemain = context.state.players.some(
        (candidate) =>
          candidate.id !== defender.id &&
          candidate.isActive &&
          candidate.teamId === defender.teamId &&
          candidate.currentTileId === defenderTile.id,
      );
      if (
        !otherDefendersRemain &&
        respawn.id !== defenderTile.id &&
        !this.isProtectedByEnemyTower(context.state, defenderTile, context.player.teamId) &&
        !context.state.buildings.some((building) => building.tileId === defenderTile.id) &&
        !context.state.towers.some(
          (tower) =>
            tower.tileId === defenderTile.id && tower.status !== CivilizationTowerStatus.CANCELLED,
        )
      ) {
        attackerMoved = true;
        await this.repository.updatePlayer(
          context.player.id,
          { currentTileId: defenderTile.id },
          context.tx,
        );
        await this.repository.createEvent(
          {
            gameId: context.gameId,
            teamId: context.player.teamId,
            actorPlayerId: context.player.id,
            tileId: defenderTile.id,
            eventType: CivilizationEventType.PLAYER_MOVED,
            payload: {
              sourceTileId: attackerTile.id,
              destinationTileId: defenderTile.id,
              source: 'PLAYER_ATTACK_VICTORY',
            },
          },
          context.tx,
        );
        const building = context.state.buildings.find(
          (candidate) => candidate.tileId === defenderTile.id,
        );
        if (!building && defenderTile.ownerTeamId !== context.player.teamId) {
          const previousOwnerTeamId = defenderTile.ownerTeamId;
          await this.repository.updateTile(
            defenderTile.id,
            { ownerTeamId: context.player.teamId, isConnected: false },
            context.tx,
          );
          await this.removeCapturedTileTowers(context, defenderTile.id);
          await this.repository.createEvent(
            {
              gameId: context.gameId,
              teamId: context.player.teamId,
              actorPlayerId: context.player.id,
              tileId: defenderTile.id,
              eventType: CivilizationEventType.TILE_CAPTURED,
              payload: {
                previousOwnerTeamId,
                ownerTeamId: context.player.teamId,
                source: 'PLAYER_ATTACK_VICTORY',
              },
            },
            context.tx,
          );
          await this.connectivityService.recalculate(context.gameId, context.now, context.tx);
        }
      }

      await this.repository.createEvent(
        {
          gameId: context.gameId,
          teamId: defender.teamId,
          actorPlayerId: context.player.id,
          targetPlayerId: defender.id,
          tileId: defenderTile.id,
          eventType: CivilizationEventType.PLAYER_DEFEATED,
          payload: { respawnTileId: respawn.id },
        },
        context.tx,
      );
      await this.repository.createEvent(
        {
          gameId: context.gameId,
          teamId: defender.teamId,
          targetPlayerId: defender.id,
          tileId: respawn.id,
          eventType: CivilizationEventType.PLAYER_RESPAWNED,
          payload: { teamSpawnTileId: respawn.id },
        },
        context.tx,
      );
    }

    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        targetPlayerId: defender.id,
        tileId: defenderTile.id,
        eventType: CivilizationEventType.PLAYER_ATTACKED,
        payload: {
          randomRoll,
          attackerWinPercent: context.settings.combat.attackerWinPercent,
          attackerWon,
          attackerMoved,
          respawnTileId,
          actionPointUnitsSpent: context.settings.costs.attackPlayerUnits,
        },
      },
      context.tx,
    );
    return { event };
  }

  private async captureBuildingInTransaction(
    context: ActionExecutionContext,
    input: CaptureCivilizationBuildingDto,
  ): Promise<ActionMutationResult> {
    const building = context.state.buildings.find((candidate) => candidate.id === input.buildingId);
    if (!building || building.buildingType === CivilizationBuildingType.TOWN_HALL) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'Target is not a capturable resource building',
      );
    }
    const playerTile = this.tile(context.state, context.player.currentTileId);
    const buildingTile = this.tile(context.state, building.tileId);
    if (playerTile.id !== buildingTile.id && !areHexesAdjacent(playerTile, buildingTile)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'The player must occupy or be adjacent to the building tile',
      );
    }
    if (this.hasEnemyOnTile(context.state, building.tileId, context.player.teamId)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
        'Enemy players on the building tile must be defeated first',
      );
    }
    if (this.isProtectedByEnemyTower(context.state, buildingTile, context.player.teamId)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_PROTECTED_BY_TOWER,
        'The building is protected by an active connected enemy tower',
      );
    }
    if (building.ownerTeamId === context.player.teamId && !building.captureTeamId) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'The team already controls this building',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.costs.buildingCaptureUnits,
      context.tx,
    );

    let captureTeamId = building.captureTeamId;
    let progress = building.captureProgressUnits;
    let captured = false;
    let contributionUnitsApplied: number;
    let eventType: CivilizationEventType = CivilizationEventType.BUILDING_CAPTURE_PROGRESS;
    if (captureTeamId && captureTeamId !== context.player.teamId) {
      contributionUnitsApplied = Math.min(
        progress,
        context.settings.buildingCapture.contributionUnits,
      );
      progress = Math.max(0, progress - context.settings.buildingCapture.contributionUnits);
      if (progress === 0) captureTeamId = null;
    } else {
      if (!captureTeamId) {
        captureTeamId = context.player.teamId;
        eventType = CivilizationEventType.BUILDING_CAPTURE_STARTED;
      }
      contributionUnitsApplied = Math.min(
        building.captureRequiredUnits - progress,
        context.settings.buildingCapture.contributionUnits,
      );
      progress = Math.min(
        building.captureRequiredUnits,
        progress + context.settings.buildingCapture.contributionUnits,
      );
      captured = progress >= building.captureRequiredUnits;
    }

    if (captured) {
      eventType = CivilizationEventType.BUILDING_CAPTURED;
      const previousOwnerTeamId = building.ownerTeamId;
      await this.repository.updateBuilding(
        building.id,
        {
          ownerTeamId: context.player.teamId,
          captureTeamId: null,
          captureProgressUnits: 0,
        },
        context.tx,
      );
      await this.repository.updateTile(
        building.tileId,
        { ownerTeamId: context.player.teamId, isConnected: false },
        context.tx,
      );
      await this.removeCapturedTileTowers(context, building.tileId);
      await this.repository.createEvent(
        {
          gameId: context.gameId,
          teamId: context.player.teamId,
          actorPlayerId: context.player.id,
          tileId: building.tileId,
          eventType: CivilizationEventType.TILE_CAPTURED,
          payload: {
            previousOwnerTeamId,
            ownerTeamId: context.player.teamId,
            source: 'BUILDING_CAPTURED',
          },
        },
        context.tx,
      );
      await this.connectivityService.recalculate(context.gameId, context.now, context.tx);
    } else {
      await this.repository.updateBuilding(
        building.id,
        { captureTeamId, captureProgressUnits: progress },
        context.tx,
      );
    }

    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: building.tileId,
        eventType,
        payload: {
          buildingId: building.id,
          captureTeamId,
          captureProgressUnits: captured ? 0 : progress,
          captureRequiredUnits: building.captureRequiredUnits,
          captured,
          contributionUnits: contributionUnitsApplied,
          actionPointUnitsSpent: context.settings.costs.buildingCaptureUnits,
        },
      },
      context.tx,
    );
    return { event };
  }

  private async buildTowerInTransaction(
    context: ActionExecutionContext,
    input: BuildCivilizationTowerDto,
  ): Promise<ActionMutationResult> {
    const tile = context.state.tiles.find(
      (candidate) => candidate.q === input.tile.q && candidate.r === input.tile.r,
    );
    if (
      !tile ||
      !areHexesAdjacent(this.tile(context.state, context.player.currentTileId), tile) ||
      tile.terrainType === CivilizationTerrainType.MOUNTAIN ||
      tile.ownerTeamId !== context.player.teamId ||
      !tile.isConnected ||
      context.state.buildings.some((building) => building.tileId === tile.id) ||
      context.state.towers.some(
        (tower) => tower.tileId === tile.id && tower.status !== CivilizationTowerStatus.CANCELLED,
      ) ||
      context.state.spawnPoints.some((spawn) => spawn.tileId === tile.id) ||
      context.state.players.some((player) => player.isActive && player.currentTileId === tile.id)
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_PLACEMENT_INVALID,
        'Tower placement requires an adjacent, empty, connected, owned ground tile',
      );
    }
    const candidate = {
      center: tile,
      radius: context.settings.tower.protectionRadius,
    };
    const overlaps = context.state.towers.some((tower) => {
      if (tower.status === CivilizationTowerStatus.CANCELLED) return false;
      const towerTile = context.state.tiles.find(
        (candidateTile) => candidateTile.id === tower.tileId,
      );
      return (
        towerTile !== undefined &&
        towerProtectionAreasOverlap(candidate, {
          center: towerTile,
          radius: tower.protectionRadius,
        })
      );
    });
    if (overlaps) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_RADIUS_OVERLAP,
        'Tower protection areas may not overlap',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.costs.towerBuildUnits,
      context.tx,
    );
    await this.spendGold(
      context,
      context.settings.tower.buildGoldCost,
      'TOWER_CONSTRUCTION',
      tile.id,
    );
    const completesAt = new Date(
      context.now.getTime() + context.settings.tower.constructionMinutes * 60_000,
    );
    const tower = await this.repository.createTower(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        tileId: tile.id,
        status: CivilizationTowerStatus.UNDER_CONSTRUCTION,
        workKind: CivilizationTowerWorkKind.BUILD,
        protectionRadius: context.settings.tower.protectionRadius,
        destructionProgressActions: 0,
        destructionRequiredActions: context.settings.tower.destructionRequiredActions,
        constructionStartedAt: context.now,
        constructionCompletesAt: completesAt,
        createdByPlayerId: context.player.id,
      },
      context.tx,
    );
    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: tile.id,
        eventType: CivilizationEventType.TOWER_CONSTRUCTION_STARTED,
        payload: {
          towerId: tower.id,
          constructionCompletesAt: completesAt.toISOString(),
          goldSpent: context.settings.tower.buildGoldCost,
          actionPointUnitsSpent: context.settings.costs.towerBuildUnits,
        },
      },
      context.tx,
    );
    return { event, towerJob: { towerId: tower.id, gameId: context.gameId, completesAt } };
  }

  private async attackTowerInTransaction(
    context: ActionExecutionContext,
    input: CivilizationTowerActionDto,
  ): Promise<ActionMutationResult> {
    const tower = context.state.towers.find((candidate) => candidate.id === input.towerId);
    if (
      !tower ||
      tower.teamId === context.player.teamId ||
      (tower.status !== CivilizationTowerStatus.ACTIVE &&
        tower.status !== CivilizationTowerStatus.DESTROYED)
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_ATTACKABLE,
        'Target tower is not attackable',
      );
    }
    const playerTile = this.tile(context.state, context.player.currentTileId);
    const towerTile = this.tile(context.state, tower.tileId);
    if (
      !isOnTowerAttackBoundary(playerTile, {
        center: towerTile,
        radius: tower.protectionRadius,
      })
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_ATTACKABLE,
        'The player must stand directly outside the tower protection area',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.costs.towerAttackUnits,
      context.tx,
    );
    const removingDestroyedTower = tower.status === CivilizationTowerStatus.DESTROYED;
    const destructionProgressActions = removingDestroyedTower
      ? tower.destructionRequiredActions
      : Math.min(tower.destructionRequiredActions, tower.destructionProgressActions + 1);
    const destroyed = destructionProgressActions >= tower.destructionRequiredActions;
    await this.repository.updateTower(
      tower.id,
      {
        status: removingDestroyedTower
          ? CivilizationTowerStatus.CANCELLED
          : destroyed
            ? CivilizationTowerStatus.DESTROYED
            : CivilizationTowerStatus.ACTIVE,
        destructionProgressActions,
        destroyedAt: destroyed ? context.now : null,
      },
      context.tx,
    );
    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: tower.tileId,
        eventType:
          destroyed || removingDestroyedTower
            ? CivilizationEventType.TOWER_DESTROYED
            : CivilizationEventType.TOWER_ATTACKED,
        payload: {
          towerId: tower.id,
          destructionProgressActions,
          destructionRequiredActions: tower.destructionRequiredActions,
          destroyed,
          structureRemoved: removingDestroyedTower,
          actionPointUnitsSpent: context.settings.costs.towerAttackUnits,
        },
      },
      context.tx,
    );
    return { event };
  }

  private async catapultAttackInTransaction(
    context: ActionExecutionContext,
    input: CivilizationCatapultActionDto,
  ): Promise<ActionMutationResult> {
    if (!context.settings.catapult.enabled) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_ATTACKABLE,
        'Catapults are disabled for this game',
      );
    }
    const buildingTargetIds = [input.buildingId, input.townHallBuildingId].filter(
      (value): value is string => Boolean(value),
    );
    if (Number(Boolean(input.towerId)) + buildingTargetIds.length !== 1) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.CATAPULT_TARGET_INVALID,
        'Choose exactly one enemy structure target',
      );
    }
    if (buildingTargetIds[0]) {
      return this.catapultAttackBuildingInTransaction(context, buildingTargetIds[0]);
    }
    const tower = context.state.towers.find((candidate) => candidate.id === input.towerId);
    const towerIsUnderConstruction = tower?.status === CivilizationTowerStatus.UNDER_CONSTRUCTION;
    if (
      !tower ||
      tower.teamId === context.player.teamId ||
      (tower.status !== CivilizationTowerStatus.ACTIVE && !towerIsUnderConstruction) ||
      tower.destructionProgressActions >= tower.destructionRequiredActions
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_ATTACKABLE,
        'Target must be an active or under-construction enemy defensive tower',
      );
    }
    const playerTile = this.tile(context.state, context.player.currentTileId);
    const towerTile = this.tile(context.state, tower.tileId);
    if (
      !isOnTowerAttackBoundary(playerTile, {
        center: towerTile,
        radius: tower.protectionRadius,
      })
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_ATTACKABLE,
        'The player must stand directly outside the tower protection area',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.catapult.actionPointUnits,
      context.tx,
    );
    await this.spendGold(
      context,
      context.settings.catapult.goldPrice,
      'CATAPULT_ATTACK',
      tower.tileId,
    );
    const destructionProgressActions = towerIsUnderConstruction
      ? tower.destructionRequiredActions
      : Math.min(
          tower.destructionRequiredActions,
          tower.destructionProgressActions + context.settings.catapult.damage,
        );
    const destroyed = destructionProgressActions >= tower.destructionRequiredActions;
    await this.repository.updateTower(
      tower.id,
      {
        destructionProgressActions,
        status: destroyed ? CivilizationTowerStatus.DESTROYED : CivilizationTowerStatus.ACTIVE,
        workKind: destroyed ? null : tower.workKind,
        constructionCompletesAt: destroyed ? null : tower.constructionCompletesAt,
        destroyedAt: destroyed ? context.now : null,
      },
      context.tx,
    );
    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: tower.tileId,
        eventType: CivilizationEventType.CATAPULT_ATTACKED,
        payload: {
          towerId: tower.id,
          sourceTileId: playerTile.id,
          targetTileId: tower.tileId,
          damageActions: context.settings.catapult.damage,
          destructionProgressActions,
          destructionRequiredActions: tower.destructionRequiredActions,
          destroyed,
          wasUnderConstruction: towerIsUnderConstruction,
          goldSpent: context.settings.catapult.goldPrice,
          actionPointUnitsSpent: context.settings.catapult.actionPointUnits,
        },
      },
      context.tx,
    );
    return { event };
  }

  private async catapultAttackBuildingInTransaction(
    context: ActionExecutionContext,
    buildingId: string,
  ): Promise<ActionMutationResult> {
    const building = context.state.buildings.find((candidate) => candidate.id === buildingId);
    if (!building?.ownerTeamId || building.ownerTeamId === context.player.teamId) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.CATAPULT_TARGET_INVALID,
        'Target must be an enemy building',
      );
    }
    const isTownHall = building.buildingType === CivilizationBuildingType.TOWN_HALL;
    const playerTile = this.tile(context.state, context.player.currentTileId);
    const buildingTile = this.tile(context.state, building.tileId);
    if (!areHexesAdjacent(playerTile, buildingTile)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.CATAPULT_TARGET_INVALID,
        'The player must stand next to the enemy building',
      );
    }
    if (this.hasEnemyOnTile(context.state, building.tileId, context.player.teamId)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
        'Defending players on the building must be defeated first',
      );
    }
    if (this.isProtectedByEnemyTower(context.state, buildingTile, context.player.teamId)) {
      throw new CivilizationException(
        isTownHall
          ? CIVILIZATION_ERROR_CODES.TOWN_HALL_PROTECTED
          : CIVILIZATION_ERROR_CODES.TILE_PROTECTED_BY_TOWER,
        'The building is protected by an active connected tower',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.catapult.actionPointUnits,
      context.tx,
    );
    await this.spendGold(
      context,
      context.settings.catapult.goldPrice,
      'CATAPULT_ATTACK',
      building.tileId,
    );

    const previousProgress =
      building.captureTeamId && building.captureTeamId !== context.player.teamId
        ? 0
        : building.captureProgressUnits;
    const damageCaptureProgressUnits = context.settings.catapult.damage * 2;
    const progress = Math.min(
      building.captureRequiredUnits,
      previousProgress + damageCaptureProgressUnits,
    );
    const captured = progress >= building.captureRequiredUnits;
    await this.repository.updateBuilding(
      building.id,
      {
        ownerTeamId: captured && !isTownHall ? context.player.teamId : building.ownerTeamId,
        status: captured && isTownHall ? CivilizationBuildingStatus.CAPTURED : building.status,
        captureTeamId: captured ? null : context.player.teamId,
        captureProgressUnits: captured ? 0 : progress,
      },
      context.tx,
    );
    if (captured) {
      await this.repository.updateTile(
        building.tileId,
        { ownerTeamId: context.player.teamId, isConnected: false },
        context.tx,
      );
      await this.repository.createEvent(
        {
          gameId: context.gameId,
          teamId: context.player.teamId,
          actorPlayerId: context.player.id,
          tileId: building.tileId,
          eventType: CivilizationEventType.TILE_CAPTURED,
          payload: {
            previousOwnerTeamId: building.ownerTeamId,
            ownerTeamId: context.player.teamId,
            source: 'CATAPULT_ATTACK',
          },
        },
        context.tx,
      );
      if (!isTownHall) {
        await this.removeCapturedTileTowers(context, building.tileId);
        await this.connectivityService.recalculate(context.gameId, context.now, context.tx);
      }
    }
    await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: building.tileId,
        eventType: isTownHall
          ? captured
            ? CivilizationEventType.TOWN_HALL_CAPTURED
            : CivilizationEventType.TOWN_HALL_CAPTURE_PROGRESS
          : captured
            ? CivilizationEventType.BUILDING_CAPTURED
            : previousProgress === 0
              ? CivilizationEventType.BUILDING_CAPTURE_STARTED
              : CivilizationEventType.BUILDING_CAPTURE_PROGRESS,
        payload: {
          buildingId: building.id,
          ...(isTownHall ? { townHallBuildingId: building.id } : {}),
          previousOwnerTeamId: building.ownerTeamId,
          ownerTeamId: captured && !isTownHall ? context.player.teamId : building.ownerTeamId,
          capturedByTeamId: captured ? context.player.teamId : null,
          captureProgressUnits: captured ? building.captureRequiredUnits : progress,
          captureRequiredUnits: building.captureRequiredUnits,
          contributionUnits: Math.min(
            damageCaptureProgressUnits,
            building.captureRequiredUnits - previousProgress,
          ),
          actionPointUnitsSpent: context.settings.catapult.actionPointUnits,
          source: 'CATAPULT_ATTACK',
        },
      },
      context.tx,
    );
    if (captured && isTownHall) {
      await this.completionService.completeInTransaction(
        context.gameId,
        CivilizationCompletionReason.TOWN_HALL_CAPTURED,
        context.player.teamId,
        context.now,
        context.tx,
      );
    }
    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: building.tileId,
        eventType: CivilizationEventType.CATAPULT_ATTACKED,
        payload: {
          buildingId: building.id,
          ...(isTownHall ? { townHallBuildingId: building.id } : {}),
          sourceTileId: playerTile.id,
          targetTileId: building.tileId,
          damageActions: context.settings.catapult.damage,
          damageCaptureProgressUnits,
          captureProgressUnits: captured ? building.captureRequiredUnits : progress,
          captureRequiredUnits: building.captureRequiredUnits,
          captured,
          goldSpent: context.settings.catapult.goldPrice,
          actionPointUnitsSpent: context.settings.catapult.actionPointUnits,
        },
      },
      context.tx,
    );
    return { event };
  }

  private async repairTowerInTransaction(
    context: ActionExecutionContext,
    input: CivilizationRepairActionDto,
  ): Promise<ActionMutationResult> {
    if (!context.settings.repairKit.enabled) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_REPAIRABLE,
        'Repair kits are disabled for this game',
      );
    }
    const buildingTargetIds = [input.buildingId, input.townHallBuildingId].filter(
      (value): value is string => Boolean(value),
    );
    if (Number(Boolean(input.towerId)) + buildingTargetIds.length !== 1) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_REPAIRABLE,
        'Choose exactly one allied structure target',
      );
    }
    if (buildingTargetIds[0]) {
      return this.repairBuildingWithKitInTransaction(context, buildingTargetIds[0]);
    }
    const tower = context.state.towers.find((candidate) => candidate.id === input.towerId);
    if (
      !tower ||
      tower.teamId !== context.player.teamId ||
      (tower.status !== CivilizationTowerStatus.ACTIVE &&
        tower.status !== CivilizationTowerStatus.DESTROYED) ||
      tower.destructionProgressActions <= 0
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_REPAIRABLE,
        'Target tower is not repairable by this team',
      );
    }
    const playerTile = this.tile(context.state, context.player.currentTileId);
    const towerTile = this.tile(context.state, tower.tileId);
    if (
      !areHexesAdjacent(playerTile, towerTile) ||
      towerTile.ownerTeamId !== context.player.teamId ||
      !towerTile.isConnected ||
      this.hasEnemyOnTile(context.state, towerTile.id, context.player.teamId)
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWER_NOT_REPAIRABLE,
        'The player must stand next to a connected tower owned by their team',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.costs.towerRepairUnits,
      context.tx,
    );
    await this.spendGold(context, context.settings.repairKit.goldPrice, 'REPAIR_KIT', tower.tileId);
    const destructionProgressActions = Math.max(
      0,
      tower.destructionProgressActions - context.settings.repairKit.repairActions,
    );
    await this.repository.updateTower(
      tower.id,
      {
        status: CivilizationTowerStatus.ACTIVE,
        destructionProgressActions,
        workKind: null,
        constructionCompletesAt: null,
        destroyedAt: null,
      },
      context.tx,
    );
    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: tower.tileId,
        eventType: CivilizationEventType.TOWER_REPAIRED,
        payload: {
          towerId: tower.id,
          repairActions: context.settings.repairKit.repairActions,
          destructionProgressActions,
          destructionRequiredActions: tower.destructionRequiredActions,
          actionPointUnitsSpent: context.settings.costs.towerRepairUnits,
          goldSpent: context.settings.repairKit.goldPrice,
        },
      },
      context.tx,
    );
    return { event };
  }

  private async repairBuildingWithKitInTransaction(
    context: ActionExecutionContext,
    buildingId: string,
  ): Promise<ActionMutationResult> {
    if (!context.settings.repairKit.enabled) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'Repair kits are disabled for this game',
      );
    }
    const building = context.state.buildings.find((candidate) => candidate.id === buildingId);
    if (
      !building ||
      building.ownerTeamId !== context.player.teamId ||
      building.captureProgressUnits <= 0
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'Target must be a damaged allied building',
      );
    }
    const isTownHall = building.buildingType === CivilizationBuildingType.TOWN_HALL;
    const playerTile = this.tile(context.state, context.player.currentTileId);
    const buildingTile = this.tile(context.state, building.tileId);
    if (
      !areHexesAdjacent(playerTile, buildingTile) ||
      !buildingTile.isConnected ||
      this.hasEnemyOnTile(context.state, buildingTile.id, context.player.teamId)
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'The player must stand next to their connected undefended building',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.costs.towerRepairUnits,
      context.tx,
    );
    await this.spendGold(
      context,
      context.settings.repairKit.goldPrice,
      'REPAIR_KIT',
      building.tileId,
    );
    const repairedCaptureProgressUnits = Math.min(
      context.settings.repairKit.repairActions * 2,
      building.captureProgressUnits,
    );
    const captureProgressUnits = building.captureProgressUnits - repairedCaptureProgressUnits;
    await this.repository.updateBuilding(
      building.id,
      {
        captureProgressUnits,
        captureTeamId: captureProgressUnits === 0 ? null : building.captureTeamId,
      },
      context.tx,
    );
    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: building.tileId,
        eventType: isTownHall
          ? CivilizationEventType.TOWN_HALL_DEFENDED
          : CivilizationEventType.BUILDING_CAPTURE_PROGRESS,
        payload: {
          buildingId: building.id,
          ...(isTownHall ? { townHallBuildingId: building.id } : {}),
          repairActions: context.settings.repairKit.repairActions,
          repairedCaptureProgressUnits,
          captureProgressUnits,
          captureRequiredUnits: building.captureRequiredUnits,
          actionPointUnitsSpent: context.settings.costs.towerRepairUnits,
          goldSpent: context.settings.repairKit.goldPrice,
          source: 'REPAIR_KIT',
        },
      },
      context.tx,
    );
    return { event };
  }

  private async captureTownHallInTransaction(
    context: ActionExecutionContext,
    input: CivilizationTownHallActionDto,
  ): Promise<ActionMutationResult> {
    const townHall = context.state.buildings.find(
      (building) =>
        building.id === input.townHallBuildingId &&
        building.buildingType === CivilizationBuildingType.TOWN_HALL,
    );
    if (!townHall || !townHall.ownerTeamId || townHall.ownerTeamId === context.player.teamId) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'Target must be the enemy town hall',
      );
    }
    const tile = this.tile(context.state, townHall.tileId);
    const playerTile = this.tile(context.state, context.player.currentTileId);
    if (playerTile.id !== tile.id && !areHexesAdjacent(playerTile, tile)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.BUILDING_NOT_CAPTURABLE,
        'The attacker must occupy or be adjacent to the town-hall tile',
      );
    }
    if (this.hasEnemyOnTile(context.state, tile.id, context.player.teamId)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
        'Defending players on the town hall must be defeated first',
      );
    }
    if (this.isProtectedByEnemyTower(context.state, tile, context.player.teamId)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.TOWN_HALL_PROTECTED,
        'The town hall is protected by an active connected tower',
      );
    }
    await this.spendActionPoints(
      context.player,
      context.settings.costs.townHallCaptureUnits,
      context.tx,
    );
    const previousProgress =
      townHall.captureTeamId && townHall.captureTeamId !== context.player.teamId
        ? 0
        : townHall.captureProgressUnits;
    const progress = Math.min(
      townHall.captureRequiredUnits,
      previousProgress + context.settings.townHall.contributionUnits,
    );
    const captured = progress >= townHall.captureRequiredUnits;
    await this.repository.updateBuilding(
      townHall.id,
      {
        ownerTeamId: townHall.ownerTeamId,
        status: captured ? CivilizationBuildingStatus.CAPTURED : townHall.status,
        captureTeamId: captured ? null : context.player.teamId,
        captureProgressUnits: captured ? 0 : progress,
      },
      context.tx,
    );
    if (captured) {
      const previousOwnerTeamId = townHall.ownerTeamId;
      await this.repository.updateTile(
        townHall.tileId,
        { ownerTeamId: context.player.teamId, isConnected: false },
        context.tx,
      );
      await this.repository.createEvent(
        {
          gameId: context.gameId,
          teamId: context.player.teamId,
          actorPlayerId: context.player.id,
          tileId: townHall.tileId,
          eventType: CivilizationEventType.TILE_CAPTURED,
          payload: {
            previousOwnerTeamId,
            ownerTeamId: context.player.teamId,
            source: 'TOWN_HALL_CAPTURED',
          },
        },
        context.tx,
      );
    }
    const event = await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId: townHall.tileId,
        eventType: captured
          ? CivilizationEventType.TOWN_HALL_CAPTURED
          : CivilizationEventType.TOWN_HALL_CAPTURE_PROGRESS,
        payload: {
          townHallBuildingId: townHall.id,
          previousOwnerTeamId: townHall.ownerTeamId,
          ownerTeamId: townHall.ownerTeamId,
          capturedByTeamId: captured ? context.player.teamId : null,
          captureProgressUnits: captured ? townHall.captureRequiredUnits : progress,
          captureRequiredUnits: townHall.captureRequiredUnits,
          contributionUnits: Math.min(
            context.settings.townHall.contributionUnits,
            townHall.captureRequiredUnits - previousProgress,
          ),
          actionPointUnitsSpent: context.settings.costs.townHallCaptureUnits,
        },
      },
      context.tx,
    );
    if (captured) {
      await this.completionService.completeInTransaction(
        context.gameId,
        CivilizationCompletionReason.TOWN_HALL_CAPTURED,
        context.player.teamId,
        context.now,
        context.tx,
      );
    }
    return { event };
  }

  private async defendTownHallInTransaction(
    context: ActionExecutionContext,
    input: CivilizationTownHallActionDto,
  ): Promise<ActionMutationResult> {
    return this.repairBuildingWithKitInTransaction(context, input.townHallBuildingId);
  }

  private async spendActionPoints(
    player: CivilizationStateRecord['players'][number],
    cost: number,
    tx: CivilizationTransaction,
  ): Promise<void> {
    if (player.actionPointUnits < cost) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.NOT_ENOUGH_ACTION_POINTS,
        'Not enough action points',
        409,
        { availableUnits: player.actionPointUnits, requiredUnits: cost },
      );
    }
    await this.repository.updatePlayer(
      player.id,
      { actionPointUnits: player.actionPointUnits - cost },
      tx,
    );
  }

  private async spendGold(
    context: ActionExecutionContext,
    amount: string,
    reason: string,
    tileId: string,
  ): Promise<void> {
    const resource = context.state.teamResources.find(
      (candidate) => candidate.teamId === context.player.teamId,
    );
    if (!resource) throw new Error('Team resource row is missing');
    const cost = new Prisma.Decimal(amount);
    if (resource.goldAmount.lessThan(cost)) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.NOT_ENOUGH_TEAM_GOLD,
        'Not enough team gold',
        409,
        { available: resource.goldAmount.toString(), required: cost.toString() },
      );
    }
    const resultingBalance = resource.goldAmount.minus(cost);
    await this.repository.updateTeamResource(
      resource.id,
      { goldAmount: resultingBalance },
      context.tx,
    );
    await this.repository.createEvent(
      {
        gameId: context.gameId,
        teamId: context.player.teamId,
        actorPlayerId: context.player.id,
        tileId,
        eventType: CivilizationEventType.TEAM_GOLD_SPENT,
        payload: {
          reason,
          amount: cost.toString(),
          previousBalance: resource.goldAmount.toString(),
          resultingBalance: resultingBalance.toString(),
        },
      },
      context.tx,
    );
  }

  private async removeCapturedTileTowers(
    context: ActionExecutionContext,
    tileId: string,
  ): Promise<void> {
    for (const tower of context.state.towers.filter(
      (candidate) =>
        candidate.tileId === tileId &&
        candidate.teamId !== context.player.teamId &&
        candidate.status !== CivilizationTowerStatus.CANCELLED,
    )) {
      if (tower.status === CivilizationTowerStatus.DESTROYED) {
        await this.repository.deleteTower(tower.id, context.tx);
      } else {
        await this.repository.updateTower(
          tower.id,
          { status: CivilizationTowerStatus.CANCELLED, workKind: null },
          context.tx,
        );
      }
      if (tower.status === CivilizationTowerStatus.UNDER_CONSTRUCTION) {
        await this.repository.createEvent(
          {
            gameId: context.gameId,
            teamId: tower.teamId,
            actorPlayerId: context.player.id,
            tileId,
            eventType: CivilizationEventType.TOWER_CONSTRUCTION_CANCELLED,
            payload: { towerId: tower.id, reason: 'TILE_CAPTURED', refund: '0' },
          },
          context.tx,
        );
      }
    }
  }

  private isProtectedByEnemyTower(
    state: CivilizationStateRecord,
    tile: CivilizationStateRecord['tiles'][number],
    movingTeamId: string,
  ): boolean {
    return state.towers.some((tower) => {
      if (tower.teamId === movingTeamId || tower.status !== CivilizationTowerStatus.ACTIVE)
        return false;
      const center = state.tiles.find((candidate) => candidate.id === tower.tileId);
      return Boolean(center?.isConnected && hexDistance(tile, center) <= tower.protectionRadius);
    });
  }

  private hasEnemyOnTile(state: CivilizationStateRecord, tileId: string, teamId: string): boolean {
    return state.players.some(
      (player) => player.isActive && player.currentTileId === tileId && player.teamId !== teamId,
    );
  }

  private tile(
    state: CivilizationStateRecord,
    tileId: string,
  ): CivilizationStateRecord['tiles'][number] {
    const tile = state.tiles.find((candidate) => candidate.id === tileId);
    if (!tile) throw new Error(`Civilization tile ${tileId} is missing`);
    return tile;
  }

  private requestHash(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.canonicalize(value)))
      .digest('hex');
  }

  private towerJobFromStoredResponse(
    response: unknown,
    gameId: string,
  ): { towerId: string; gameId: string; completesAt: Date } | undefined {
    if (!this.isRecord(response) || !this.isRecord(response.event)) return undefined;
    const payload = response.event.payload;
    if (!this.isRecord(payload)) return undefined;
    if (
      typeof payload.towerId !== 'string' ||
      typeof payload.constructionCompletesAt !== 'string'
    ) {
      return undefined;
    }
    const completesAt = new Date(payload.constructionCompletesAt);
    if (!Number.isFinite(completesAt.getTime())) return undefined;
    return { towerId: payload.towerId, gameId, completesAt };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
}
