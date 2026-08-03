import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  CivilizationBuildingType,
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameStatus,
  CivilizationTowerStatus,
  Prisma,
} from '@prisma/client';

import {
  CIVILIZATION_ATTRIBUTE_KEYS,
  areHexesAdjacent,
  calculateTeamScore,
  hexDistance,
  isOnTowerAttackBoundary,
  parseCivilizationSettings,
  settleActionPoints,
  settleDecimalResource,
  towerProtectionAreasOverlap,
} from './domain';
import { CIVILIZATION_ERROR_CODES, CivilizationException } from './civilization.errors';
import { CivilizationCompletionService } from './civilization-completion.service';
import { CivilizationRuntimeService } from './civilization-runtime.service';
import { CivilizationSettlementService } from './civilization-settlement.service';
import {
  CivilizationRepository,
  type CivilizationEventRecord,
  type CivilizationStateRecord,
  type CivilizationStatisticEventRecord,
} from './repositories';

interface CivilizationPlayerStatistics {
  actionsUsed: number;
  actionPointUnitsSpent: number;
  cellsCaptured: number;
  successfulPlayerAttacks: number;
  failedPlayerAttacks: number;
  buildingCaptureContributions: number;
  buildingCaptureContributionUnits: number;
  buildingsCaptured: number;
  towerConstructionsStarted: number;
  towersDestroyed: number;
  towersRepaired: number;
  townHallContributions: number;
  townHallContributionUnits: number;
  townHallDefenses: number;
  goldSpent: string;
}

@Injectable()
export class CivilizationQueryService {
  constructor(
    private readonly repository: CivilizationRepository,
    private readonly settlementService: CivilizationSettlementService,
    private readonly runtime: CivilizationRuntimeService,
    private readonly completionService: CivilizationCompletionService,
  ) {}

  async getCurrent(userId: string): Promise<unknown> {
    const now = this.runtime.now();
    let state = await this.repository.findCurrentGame(now);
    if (state?.status === CivilizationGameStatus.ACTIVE && now.getTime() >= state.endAt.getTime()) {
      state = await this.completionService.completeGame(
        state.id,
        CivilizationCompletionReason.END_TIME_REACHED,
      );
    }
    return state ? this.toSummary(state, userId) : null;
  }

  async getHistory(userId: string, page: number, limit: number): Promise<unknown> {
    const result = await this.repository.listHistory(page, limit);
    return {
      items: result.items.map((game) => this.toSummary(game, userId)),
      total: result.total,
      page,
      limit,
    };
  }

  async getGameState(gameId: string, userId: string): Promise<unknown> {
    const now = this.runtime.now();
    let state = await this.repository.findStateById(gameId);
    this.assertReadable(state);

    if (state.status === CivilizationGameStatus.ACTIVE && now.getTime() >= state.endAt.getTime()) {
      state = await this.completionService.completeGame(
        gameId,
        CivilizationCompletionReason.END_TIME_REACHED,
      );
    }
    const statisticEvents = (await this.repository.listStatisticEvents?.(gameId)) ?? [];
    return this.toState(state, userId, now, this.aggregatePlayerStatistics(statisticEvents));
  }

  async getEvents(gameId: string, userId: string, page: number, limit: number): Promise<unknown> {
    const state = await this.repository.findStateById(gameId);
    this.assertReadable(state);
    void userId;
    const result = await this.repository.listEvents(gameId, page, limit);
    return {
      items: result.items.map((event) => this.toEvent(event)),
      total: result.total,
      page,
      limit,
    };
  }

  toState(
    state: CivilizationStateRecord,
    userId: string,
    now: Date,
    playerStatistics = new Map<string, CivilizationPlayerStatistics>(),
  ): Record<string, unknown> {
    const settings = parseCivilizationSettings(state.settingsJson);
    const assignedPlayer = state.players.find((player) => player.userId === userId);
    const currentPlayer =
      assignedPlayer && (assignedPlayer.isActive || state.status !== CivilizationGameStatus.ACTIVE)
        ? assignedPlayer
        : undefined;
    const tileById = new Map(state.tiles.map((tile) => [tile.id, tile]));
    const buildingByTileId = new Map(
      state.buildings.map((building) => [building.tileId, building]),
    );
    const resourceByTeamId = new Map(
      state.teamResources.map((resource) => [resource.teamId, resource]),
    );
    const attributesByTeamId = new Map(
      state.teams.map((team) => [
        team.id,
        new Map(
          state.attributeResources
            .filter((resource) => resource.teamId === team.id)
            .map((resource) => [resource.attributeKey, resource]),
        ),
      ]),
    );
    const resourceProjectionAt =
      state.status === CivilizationGameStatus.ACTIVE
        ? new Date(Math.min(now.getTime(), state.endAt.getTime()))
        : null;
    const projectedGoldByTeamId = new Map(
      state.teamResources.map((resource) => [
        resource.teamId,
        this.projectResourceAmount(
          resource.goldAmount,
          resource.goldIncomePerHour,
          resource.lastSettledAt,
          resourceProjectionAt,
        ),
      ]),
    );
    const projectedActionPointsByPlayerId = new Map(
      state.players.map((player) => [
        player.id,
        settleActionPoints({
          currentUnits: player.actionPointUnits,
          maximumUnits: settings.actionPoints.maximumUnits,
          regenerationUnits: settings.actionPoints.regenerationUnits,
          regenerationIntervalMinutes: settings.actionPoints.regenerationIntervalMinutes,
          lastActionPointUpdateAt: player.lastActionPointUpdateAt,
          now: resourceProjectionAt
            ? new Date(
                Math.max(player.lastActionPointUpdateAt.getTime(), resourceProjectionAt.getTime()),
              )
            : player.lastActionPointUpdateAt,
        }),
      ]),
    );

    const teams = state.teams.map((team) => {
      const resource = resourceByTeamId.get(team.id);
      const attributes = attributesByTeamId.get(team.id);
      const teamTiles = state.tiles.filter((tile) => tile.ownerTeamId === team.id);
      const connectedTiles = teamTiles.filter((tile) => tile.isConnected);
      const townHall = state.buildings.find(
        (building) =>
          building.buildingType === CivilizationBuildingType.TOWN_HALL &&
          building.tileId === team.townHallTileId,
      );
      const attributeAmounts = Object.fromEntries(
        CIVILIZATION_ATTRIBUTE_KEYS.map((key) => {
          const resource = attributes?.get(key);
          return [
            key,
            resource
              ? this.projectResourceAmount(
                  resource.amount,
                  resource.incomePerHour,
                  resource.lastSettledAt,
                  resourceProjectionAt,
                )
              : '0',
          ];
        }),
      );
      const attributeIncomePerHour = Object.fromEntries(
        CIVILIZATION_ATTRIBUTE_KEYS.map((key) => [
          key,
          attributes?.get(key)?.incomePerHour.toString() ?? '0',
        ]),
      );
      const estimatedScore = calculateTeamScore(
        {
          gold: projectedGoldByTeamId.get(team.id) ?? '0',
          attributes: {
            strength: attributeAmounts.strength ?? '0',
            charisma: attributeAmounts.charisma ?? '0',
            endurance: attributeAmounts.endurance ?? '0',
            intelligence: attributeAmounts.intelligence ?? '0',
          },
        },
        settings.scoreWeights,
      );

      return {
        id: team.id,
        side: team.side,
        name: team.name,
        color: team.color,
        visualKey: team.visualIdentifier,
        townHallBuildingId: townHall?.id ?? null,
        goldAmount: projectedGoldByTeamId.get(team.id) ?? '0',
        goldIncomePerHour: resource?.goldIncomePerHour.toString() ?? '0',
        attributeAmounts,
        attributeIncomePerHour,
        ownedCellCount: teamTiles.length,
        connectedCellCount: connectedTiles.length,
        disconnectedCellCount: teamTiles.length - connectedTiles.length,
        controlledBuildingCount: state.buildings.filter(
          (building) => building.ownerTeamId === team.id,
        ).length,
        activeTowerCount: state.towers.filter(
          (tower) =>
            tower.teamId === team.id &&
            tower.status === CivilizationTowerStatus.ACTIVE &&
            tileById.get(tower.tileId)?.isConnected,
        ).length,
        townHallCaptureProgress: townHall?.captureProgressUnits ?? 0,
        townHallCaptureRequired:
          townHall?.captureRequiredUnits ?? settings.townHall.captureRequiredUnits,
        estimatedScore,
        finalScore: team.finalScore?.toString() ?? null,
        totalActionPointUnits: state.players
          .filter((player) => player.teamId === team.id && player.isActive)
          .reduce(
            (total, player) =>
              total +
              (projectedActionPointsByPlayerId.get(player.id)?.actionPointUnits ??
                player.actionPointUnits),
            0,
          ),
      };
    });

    return {
      game: {
        ...this.toSummary(state, userId),
        settings,
      },
      teams,
      tiles: state.tiles.map((tile) => ({
        id: tile.id,
        coordinate: { q: tile.q, r: tile.r },
        terrainType: tile.terrainType,
        ownerTeamId: tile.ownerTeamId,
        isConnected: tile.isConnected,
      })),
      buildings: state.buildings.map((building) => ({
        id: building.id,
        tileId: building.tileId,
        type: building.buildingType,
        attributeKey: building.attributeKey,
        ownerTeamId: building.ownerTeamId,
        capturingTeamId: building.captureTeamId,
        captureProgress: building.captureProgressUnits,
        captureRequired: building.captureRequiredUnits,
        incomePerHour: building.incomePerHour.toString(),
        status: building.status,
      })),
      towers: state.towers.map((tower) => ({
        id: tower.id,
        tileId: tower.tileId,
        teamId: tower.teamId,
        status: tower.status,
        workKind: tower.workKind,
        protectionRadius: tower.protectionRadius,
        destructionProgressActions: tower.destructionProgressActions,
        destructionRequiredActions: tower.destructionRequiredActions,
        isConnected: tileById.get(tower.tileId)?.isConnected ?? false,
        constructionStartedAt: tower.constructionStartedAt.toISOString(),
        constructionCompletesAt: tower.constructionCompletesAt?.toISOString() ?? null,
        destroyedAt: tower.destroyedAt?.toISOString() ?? null,
      })),
      players: state.players.map((player) => {
        const pointState = projectedActionPointsByPlayerId.get(player.id)!;
        return {
          id: player.id,
          userId: player.userId,
          teamId: player.teamId,
          username: player.user.username,
          avatarUrl: player.user.avatarUrl,
          currentTileId: player.currentTileId,
          initialTileId: player.initialTileId,
          spawnTileId: player.spawnTileId,
          actionPointUnits: pointState.actionPointUnits,
          maximumActionPointUnits: settings.actionPoints.maximumUnits,
          nextActionPointAt:
            state.status === CivilizationGameStatus.ACTIVE
              ? (pointState.nextRegenerationAt?.toISOString() ?? null)
              : null,
          joinedAt: player.joinedAt.toISOString(),
          isActive: player.isActive,
          statistics: playerStatistics.get(player.id) ?? this.emptyPlayerStatistics(),
        };
      }),
      spawnPoints: state.spawnPoints.map((spawn) => ({
        id: spawn.id,
        teamId: spawn.teamId,
        tileId: spawn.tileId,
      })),
      rewardClaim: currentPlayer
        ? (() => {
            const claim = state.rewardClaims.find((item) => item.playerId === currentPlayer.id);
            if (claim) {
              return {
                eligible: claim.eligible,
                unavailableReason: claim.unavailableReason,
                reward: claim.rewardJson,
                expiresAt: claim.expiresAt?.toISOString() ?? null,
                claimedAt: claim.claimedAt?.toISOString() ?? null,
              };
            }
            return null;
          })()
        : null,
      recentCatapultAttacks: state.events.map((event) => ({
        id: event.id,
        actorPlayerId: event.actorPlayerId,
        tileId: event.tileId,
        payload: event.payloadJson,
        createdAt: event.createdAt.toISOString(),
      })),
      access: {
        isParticipant: Boolean(currentPlayer),
        isSpectator: !currentPlayer,
        isReadOnly: state.status !== CivilizationGameStatus.ACTIVE || !currentPlayer,
        currentPlayerId: currentPlayer?.id ?? null,
      },
      availableActions: currentPlayer
        ? this.availableActions(
            state,
            currentPlayer,
            settings,
            buildingByTileId,
            projectedGoldByTeamId,
            projectedActionPointsByPlayerId.get(currentPlayer.id)?.actionPointUnits ??
              currentPlayer.actionPointUnits,
          )
        : [],
      serverTime: now.toISOString(),
      stateVersion: state.stateVersion,
    };
  }

  toEvent(event: CivilizationEventRecord): Record<string, unknown> {
    return {
      id: event.id,
      gameId: event.gameId,
      teamId: event.teamId,
      actorPlayerId: event.actorPlayerId,
      actor: event.actorPlayer
        ? {
            userId: event.actorPlayer.userId,
            username: event.actorPlayer.user.username,
            avatarUrl: event.actorPlayer.user.avatarUrl,
          }
        : null,
      targetPlayerId: event.targetPlayerId,
      target: event.targetPlayer
        ? {
            userId: event.targetPlayer.userId,
            username: event.targetPlayer.user.username,
            avatarUrl: event.targetPlayer.user.avatarUrl,
          }
        : null,
      tileId: event.tileId,
      type: event.eventType,
      payload: event.payloadJson,
      createdAt: event.createdAt.toISOString(),
    };
  }

  private toSummary(state: CivilizationStateRecord, userId: string): Record<string, unknown> {
    const currentPlayer = state.players.find((player) => player.userId === userId);
    const winnerTeam = state.teams.find((team) => team.id === state.winnerTeamId);
    return {
      id: state.id,
      name: state.name,
      status: state.status,
      startAt: state.startAt.toISOString(),
      endAt: state.endAt.toISOString(),
      completedAt: state.completedAt?.toISOString() ?? null,
      winnerTeamId: state.winnerTeamId,
      completionReason: state.completionReason,
      teams: state.teams.map((team) => ({
        id: team.id,
        side: team.side,
        name: team.name,
        color: team.color,
        visualKey: team.visualIdentifier,
        finalScore: team.finalScore?.toString() ?? null,
        playerCount: state.players.filter((player) => player.teamId === team.id).length,
        finalGold:
          state.teamResources
            .find((resource) => resource.teamId === team.id)
            ?.goldAmount.toString() ?? '0',
        finalAttributes: Object.fromEntries(
          CIVILIZATION_ATTRIBUTE_KEYS.map((attributeKey) => [
            attributeKey,
            state.attributeResources
              .find(
                (resource) => resource.teamId === team.id && resource.attributeKey === attributeKey,
              )
              ?.amount.toString() ?? '0',
          ]),
        ),
      })),
      winnerTeam: winnerTeam
        ? {
            id: winnerTeam.id,
            name: winnerTeam.name,
            side: winnerTeam.side,
            color: winnerTeam.color,
          }
        : null,
      playerCount: state.players.length,
      currentPlayerId: currentPlayer?.id ?? null,
      currentTeamId: currentPlayer?.teamId ?? null,
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
    };
  }

  private availableActions(
    state: CivilizationStateRecord,
    player: CivilizationStateRecord['players'][number],
    settings: ReturnType<typeof parseCivilizationSettings>,
    buildingByTileId: Map<string, CivilizationStateRecord['buildings'][number]>,
    projectedGoldByTeamId: Map<string, string>,
    availableActionPointUnits: number,
  ): Record<string, unknown>[] {
    if (state.status !== CivilizationGameStatus.ACTIVE) return [];
    const currentTile = state.tiles.find((tile) => tile.id === player.currentTileId);
    if (!currentTile) return [];
    const actions: Record<string, unknown>[] = [];
    const actionPointDisabledReason = (costUnits: number): string | null =>
      availableActionPointUnits < costUnits
        ? CIVILIZATION_ERROR_CODES.NOT_ENOUGH_ACTION_POINTS
        : null;

    for (const tile of state.tiles.filter((candidate) =>
      areHexesAdjacent(currentTile, candidate),
    )) {
      const enemies = state.players.filter(
        (candidate) =>
          candidate.currentTileId === tile.id &&
          candidate.teamId !== player.teamId &&
          candidate.isActive,
      );
      if (enemies.length > 0) {
        for (const enemy of enemies) {
          actions.push({
            type: 'ATTACK_PLAYER',
            targetPlayerId: enemy.id,
            targetCoordinate: { q: tile.q, r: tile.r },
            actionPointUnits: settings.costs.attackPlayerUnits,
            goldCost: '0',
            label: 'Attack player',
            requiresConfirmation: false,
            disabledReason: actionPointDisabledReason(settings.costs.attackPlayerUnits),
          });
        }
        continue;
      }
      const destinationBuilding = buildingByTileId.get(tile.id);
      const protectedByTower = state.towers.some((tower) => {
        const towerTile = state.tiles.find((candidate) => candidate.id === tower.tileId);
        return (
          tower.teamId !== player.teamId &&
          tower.status === CivilizationTowerStatus.ACTIVE &&
          towerTile?.isConnected &&
          hexDistance(tile, towerTile) <= tower.protectionRadius
        );
      });
      if (
        destinationBuilding?.buildingType === CivilizationBuildingType.TOWN_HALL &&
        destinationBuilding.ownerTeamId !== player.teamId
      ) {
        actions.push({
          type: 'CAPTURE_TOWN_HALL',
          buildingId: destinationBuilding.id,
          targetCoordinate: { q: tile.q, r: tile.r },
          actionPointUnits: settings.costs.townHallCaptureUnits,
          goldCost: '0',
          label: 'Capture town hall',
          requiresConfirmation: false,
          disabledReason: protectedByTower
            ? CIVILIZATION_ERROR_CODES.TOWN_HALL_PROTECTED
            : actionPointDisabledReason(settings.costs.townHallCaptureUnits),
        });
        continue;
      }
      if (destinationBuilding) {
        if (
          destinationBuilding.ownerTeamId !== player.teamId ||
          (destinationBuilding.captureTeamId !== null &&
            destinationBuilding.captureTeamId !== player.teamId)
        ) {
          actions.push({
            type: 'CAPTURE_BUILDING',
            buildingId: destinationBuilding.id,
            targetCoordinate: { q: tile.q, r: tile.r },
            actionPointUnits: settings.costs.buildingCaptureUnits,
            goldCost: '0',
            label: 'Contribute to building capture',
            requiresConfirmation: false,
            disabledReason: protectedByTower
              ? CIVILIZATION_ERROR_CODES.TILE_PROTECTED_BY_TOWER
              : actionPointDisabledReason(settings.costs.buildingCaptureUnits),
          });
        }
        continue;
      }
      if (
        state.towers.some(
          (tower) =>
            tower.tileId === tile.id &&
            tower.status !== CivilizationTowerStatus.CANCELLED &&
            tower.status !== CivilizationTowerStatus.DESTROYED,
        )
      ) {
        continue;
      }
      if (
        !state.spawnPoints.some(
          (spawn) => spawn.tileId === tile.id && spawn.teamId === player.teamId,
        ) &&
        state.players.some(
          (candidate) =>
            candidate.id !== player.id && candidate.isActive && candidate.currentTileId === tile.id,
        )
      ) {
        continue;
      }
      const environmentalDisabledReason =
        tile.terrainType === 'MOUNTAIN'
          ? CIVILIZATION_ERROR_CODES.TILE_IMPASSABLE
          : state.spawnPoints.some(
                (spawn) => spawn.tileId === tile.id && spawn.teamId !== player.teamId,
              )
            ? CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY
            : protectedByTower
              ? CIVILIZATION_ERROR_CODES.TILE_PROTECTED_BY_TOWER
              : null;
      actions.push({
        type: 'MOVE',
        targetCoordinate: { q: tile.q, r: tile.r },
        actionPointUnits:
          tile.ownerTeamId === player.teamId
            ? settings.costs.ownedMoveUnits
            : settings.costs.otherMoveUnits,
        goldCost: '0',
        label: 'Move',
        requiresConfirmation: false,
        disabledReason:
          environmentalDisabledReason ??
          actionPointDisabledReason(
            tile.ownerTeamId === player.teamId
              ? settings.costs.ownedMoveUnits
              : settings.costs.otherMoveUnits,
          ),
      });
    }

    const currentBuilding = buildingByTileId.get(currentTile.id);
    if (
      currentBuilding?.buildingType === CivilizationBuildingType.TOWN_HALL &&
      currentBuilding.ownerTeamId !== player.teamId
    ) {
      const protectedByTower = state.towers.some((tower) => {
        const towerTile = state.tiles.find((tile) => tile.id === tower.tileId);
        return (
          tower.teamId !== player.teamId &&
          tower.status === CivilizationTowerStatus.ACTIVE &&
          towerTile?.isConnected &&
          hexDistance(currentTile, towerTile) <= tower.protectionRadius
        );
      });
      actions.push({
        type: 'CAPTURE_TOWN_HALL',
        buildingId: currentBuilding.id,
        targetCoordinate: { q: currentTile.q, r: currentTile.r },
        actionPointUnits: settings.costs.townHallCaptureUnits,
        goldCost: '0',
        label: 'Capture town hall',
        requiresConfirmation: false,
        disabledReason: protectedByTower
          ? CIVILIZATION_ERROR_CODES.TOWN_HALL_PROTECTED
          : actionPointDisabledReason(settings.costs.townHallCaptureUnits),
      });
    } else if (
      currentBuilding &&
      (currentBuilding.ownerTeamId !== player.teamId ||
        (currentBuilding.captureTeamId !== null && currentBuilding.captureTeamId !== player.teamId))
    ) {
      const protectedByTower = state.towers.some((tower) => {
        const towerTile = state.tiles.find((tile) => tile.id === tower.tileId);
        return (
          tower.teamId !== player.teamId &&
          tower.status === CivilizationTowerStatus.ACTIVE &&
          towerTile?.isConnected &&
          hexDistance(currentTile, towerTile) <= tower.protectionRadius
        );
      });
      actions.push({
        type: 'CAPTURE_BUILDING',
        buildingId: currentBuilding.id,
        targetCoordinate: { q: currentTile.q, r: currentTile.r },
        actionPointUnits: settings.costs.buildingCaptureUnits,
        goldCost: '0',
        label: 'Contribute to building capture',
        requiresConfirmation: false,
        disabledReason: protectedByTower
          ? CIVILIZATION_ERROR_CODES.TILE_PROTECTED_BY_TOWER
          : actionPointDisabledReason(settings.costs.buildingCaptureUnits),
      });
    }

    const teamGold = new Prisma.Decimal(projectedGoldByTeamId.get(player.teamId) ?? '0');
    for (const placementTile of state.tiles) {
      if (
        !areHexesAdjacent(currentTile, placementTile) ||
        placementTile.ownerTeamId !== player.teamId ||
        !placementTile.isConnected ||
        placementTile.terrainType === 'MOUNTAIN' ||
        buildingByTileId.has(placementTile.id) ||
        state.towers.some(
          (tower) =>
            tower.tileId === placementTile.id && tower.status !== CivilizationTowerStatus.CANCELLED,
        ) ||
        state.spawnPoints.some((spawn) => spawn.tileId === placementTile.id) ||
        state.players.some(
          (candidate) => candidate.isActive && candidate.currentTileId === placementTile.id,
        )
      ) {
        continue;
      }
      const overlapsTower = state.towers.some((tower) => {
        if (tower.status === CivilizationTowerStatus.CANCELLED) return false;
        const towerTile = state.tiles.find((tile) => tile.id === tower.tileId);
        return Boolean(
          towerTile &&
          towerProtectionAreasOverlap(
            { center: placementTile, radius: settings.tower.protectionRadius },
            { center: towerTile, radius: tower.protectionRadius },
          ),
        );
      });
      const lacksGold = teamGold.lessThan(new Prisma.Decimal(settings.tower.buildGoldCost));
      actions.push({
        type: 'BUILD_TOWER',
        targetCoordinate: { q: placementTile.q, r: placementTile.r },
        actionPointUnits: settings.costs.towerBuildUnits,
        goldCost: settings.tower.buildGoldCost,
        label: 'Build tower',
        requiresConfirmation: true,
        disabledReason: overlapsTower
          ? CIVILIZATION_ERROR_CODES.TOWER_RADIUS_OVERLAP
          : lacksGold
            ? CIVILIZATION_ERROR_CODES.NOT_ENOUGH_TEAM_GOLD
            : actionPointDisabledReason(settings.costs.towerBuildUnits),
      });
    }

    for (const tower of state.towers) {
      const towerTile = state.tiles.find((tile) => tile.id === tower.tileId);
      if (!towerTile) continue;
      if (
        tower.teamId !== player.teamId &&
        isOnTowerAttackBoundary(currentTile, {
          center: towerTile,
          radius: tower.protectionRadius,
        }) &&
        (tower.status === CivilizationTowerStatus.ACTIVE ||
          tower.status === CivilizationTowerStatus.DESTROYED)
      ) {
        actions.push({
          type: 'ATTACK_TOWER',
          towerId: tower.id,
          targetCoordinate: { q: towerTile.q, r: towerTile.r },
          actionPointUnits: settings.costs.towerAttackUnits,
          goldCost: '0',
          label: 'Attack tower',
          requiresConfirmation: false,
          disabledReason: actionPointDisabledReason(settings.costs.towerAttackUnits),
        });
      } else if (
        tower.teamId === player.teamId &&
        (tower.status === CivilizationTowerStatus.ACTIVE ||
          tower.status === CivilizationTowerStatus.DESTROYED) &&
        tower.destructionProgressActions > 0 &&
        towerTile.ownerTeamId === player.teamId &&
        towerTile.isConnected &&
        areHexesAdjacent(currentTile, towerTile) &&
        !state.players.some(
          (candidate) =>
            candidate.isActive &&
            candidate.currentTileId === towerTile.id &&
            candidate.teamId !== player.teamId,
        )
      ) {
        const gold = projectedGoldByTeamId.get(player.teamId) ?? '0';
        actions.push({
          type: 'REPAIR_TOWER',
          towerId: tower.id,
          targetCoordinate: { q: towerTile.q, r: towerTile.r },
          actionPointUnits: settings.costs.towerRepairUnits,
          goldCost: settings.repairKit.goldPrice,
          label: 'Use Repair Kit',
          requiresConfirmation: true,
          disabledReason: !settings.repairKit.enabled
            ? 'REPAIR_KIT_DISABLED'
            : new Prisma.Decimal(gold).lessThan(new Prisma.Decimal(settings.repairKit.goldPrice))
              ? CIVILIZATION_ERROR_CODES.NOT_ENOUGH_TEAM_GOLD
              : actionPointDisabledReason(settings.costs.towerRepairUnits),
        });
      }
    }

    for (const building of state.buildings.filter(
      (building) => building.ownerTeamId === player.teamId && building.captureProgressUnits > 0,
    )) {
      const buildingTile = state.tiles.find((tile) => tile.id === building.tileId);
      if (
        !buildingTile ||
        !buildingTile.isConnected ||
        !areHexesAdjacent(currentTile, buildingTile) ||
        state.players.some(
          (candidate) =>
            candidate.isActive &&
            candidate.currentTileId === building.tileId &&
            candidate.teamId !== player.teamId,
        )
      ) {
        continue;
      }
      actions.push({
        type: 'REPAIR_TOWER',
        buildingId: building.id,
        targetCoordinate: { q: buildingTile.q, r: buildingTile.r },
        actionPointUnits: settings.costs.towerRepairUnits,
        goldCost: settings.repairKit.goldPrice,
        label: `Use Repair Kit on ${building.buildingType === CivilizationBuildingType.TOWN_HALL ? 'Town Hall' : 'building'}`,
        requiresConfirmation: true,
        disabledReason: !settings.repairKit.enabled
          ? 'REPAIR_KIT_DISABLED'
          : teamGold.lessThan(new Prisma.Decimal(settings.repairKit.goldPrice))
            ? CIVILIZATION_ERROR_CODES.NOT_ENOUGH_TEAM_GOLD
            : actionPointDisabledReason(settings.costs.towerRepairUnits),
      });
    }

    const catapultTowerTargets = state.towers.filter((tower) => {
      if (
        tower.teamId === player.teamId ||
        (tower.status !== CivilizationTowerStatus.ACTIVE &&
          tower.status !== CivilizationTowerStatus.UNDER_CONSTRUCTION) ||
        tower.destructionProgressActions >= tower.destructionRequiredActions
      ) {
        return false;
      }
      const towerTile = state.tiles.find((tile) => tile.id === tower.tileId);
      return Boolean(
        towerTile &&
        isOnTowerAttackBoundary(currentTile, {
          center: towerTile,
          radius: tower.protectionRadius,
        }),
      );
    });
    const catapultResourceDisabledReason = !settings.catapult.enabled
      ? 'CATAPULT_DISABLED'
      : teamGold.lessThan(new Prisma.Decimal(settings.catapult.goldPrice))
        ? CIVILIZATION_ERROR_CODES.NOT_ENOUGH_TEAM_GOLD
        : actionPointDisabledReason(settings.catapult.actionPointUnits);
    for (const tower of catapultTowerTargets) {
      const towerTile = state.tiles.find((tile) => tile.id === tower.tileId)!;
      actions.push({
        type: 'CATAPULT_ATTACK',
        towerId: tower.id,
        targetCoordinate: { q: towerTile.q, r: towerTile.r },
        actionPointUnits: settings.catapult.actionPointUnits,
        goldCost: settings.catapult.goldPrice,
        label: 'Fire Catapult',
        requiresConfirmation: true,
        disabledReason: catapultResourceDisabledReason,
      });
    }
    const catapultBuildingTargets = state.buildings.filter((building) => {
      if (!building.ownerTeamId || building.ownerTeamId === player.teamId) {
        return false;
      }
      const buildingTile = state.tiles.find((tile) => tile.id === building.tileId);
      return Boolean(buildingTile && areHexesAdjacent(currentTile, buildingTile));
    });
    for (const building of catapultBuildingTargets) {
      const buildingTile = state.tiles.find((tile) => tile.id === building.tileId)!;
      const occupiedByEnemy = state.players.some(
        (candidate) =>
          candidate.isActive &&
          candidate.currentTileId === building.tileId &&
          candidate.teamId !== player.teamId,
      );
      const protectedByTower = state.towers.some((tower) => {
        const towerTile = state.tiles.find((tile) => tile.id === tower.tileId);
        return (
          tower.teamId !== player.teamId &&
          tower.status === CivilizationTowerStatus.ACTIVE &&
          towerTile?.isConnected &&
          hexDistance(buildingTile, towerTile) <= tower.protectionRadius
        );
      });
      actions.push({
        type: 'CATAPULT_ATTACK',
        buildingId: building.id,
        targetCoordinate: { q: buildingTile.q, r: buildingTile.r },
        actionPointUnits: settings.catapult.actionPointUnits,
        goldCost: settings.catapult.goldPrice,
        label: `Fire Catapult at ${building.buildingType === CivilizationBuildingType.TOWN_HALL ? 'Town Hall' : 'building'}`,
        requiresConfirmation: true,
        disabledReason: occupiedByEnemy
          ? CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY
          : protectedByTower
            ? building.buildingType === CivilizationBuildingType.TOWN_HALL
              ? CIVILIZATION_ERROR_CODES.TOWN_HALL_PROTECTED
              : CIVILIZATION_ERROR_CODES.TILE_PROTECTED_BY_TOWER
            : catapultResourceDisabledReason,
      });
    }
    if (catapultTowerTargets.length === 0 && catapultBuildingTargets.length === 0) {
      actions.push({
        type: 'CATAPULT_ATTACK',
        actionPointUnits: settings.catapult.actionPointUnits,
        goldCost: settings.catapult.goldPrice,
        label: 'Fire Catapult',
        requiresConfirmation: true,
        disabledReason: settings.catapult.enabled
          ? 'NO_VALID_CATAPULT_TARGETS'
          : 'CATAPULT_DISABLED',
      });
    }

    if (!actions.some((action) => action.type === 'REPAIR_TOWER')) {
      actions.push({
        type: 'REPAIR_TOWER',
        actionPointUnits: settings.costs.towerRepairUnits,
        goldCost: settings.repairKit.goldPrice,
        label: 'Use Repair Kit',
        requiresConfirmation: true,
        disabledReason: settings.repairKit.enabled
          ? 'NO_DAMAGED_ADJACENT_ALLIED_STRUCTURES'
          : 'REPAIR_KIT_DISABLED',
      });
    }
    return actions;
  }

  private projectResourceAmount(
    amount: Prisma.Decimal,
    incomePerHour: Prisma.Decimal,
    lastSettledAt: Date,
    projectionAt: Date | null,
  ): string {
    if (!projectionAt || projectionAt.getTime() < lastSettledAt.getTime()) {
      return amount.toString();
    }
    return settleDecimalResource({
      amount,
      incomePerHour,
      lastSettledAt,
      now: projectionAt,
    }).amount;
  }

  private aggregatePlayerStatistics(
    events: CivilizationStatisticEventRecord[],
  ): Map<string, CivilizationPlayerStatistics> {
    const statistics = new Map<string, CivilizationPlayerStatistics>();
    for (const event of events) {
      if (!event.actorPlayerId) continue;
      const player = statistics.get(event.actorPlayerId) ?? this.emptyPlayerStatistics();
      const payload = this.isRecord(event.payloadJson) ? event.payloadJson : {};
      const actionPointUnitsSpent = this.nonNegativeNumber(payload.actionPointUnitsSpent);

      switch (event.eventType) {
        case CivilizationEventType.PLAYER_MOVED:
          if (payload.source !== 'PLAYER_ATTACK_VICTORY') {
            player.actionsUsed += 1;
            player.actionPointUnitsSpent += actionPointUnitsSpent;
          }
          break;
        case CivilizationEventType.TILE_CAPTURED:
          player.cellsCaptured += 1;
          break;
        case CivilizationEventType.PLAYER_ATTACKED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          if (payload.attackerWon === true) player.successfulPlayerAttacks += 1;
          else player.failedPlayerAttacks += 1;
          break;
        case CivilizationEventType.BUILDING_CAPTURE_STARTED:
        case CivilizationEventType.BUILDING_CAPTURE_PROGRESS:
        case CivilizationEventType.BUILDING_CAPTURED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          player.buildingCaptureContributions += 1;
          player.buildingCaptureContributionUnits += this.nonNegativeNumber(
            payload.contributionUnits,
          );
          if (event.eventType === CivilizationEventType.BUILDING_CAPTURED) {
            player.buildingsCaptured += 1;
          }
          break;
        case CivilizationEventType.TOWER_CONSTRUCTION_STARTED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          player.towerConstructionsStarted += 1;
          break;
        case CivilizationEventType.TOWER_ATTACKED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          break;
        case CivilizationEventType.TOWER_DESTROYED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          player.towersDestroyed += 1;
          break;
        case CivilizationEventType.TOWER_REPAIR_STARTED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          player.towersRepaired += 1;
          break;
        case CivilizationEventType.TOWER_REPAIRED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          player.towersRepaired += 1;
          break;
        case CivilizationEventType.TOWN_HALL_CAPTURE_PROGRESS:
        case CivilizationEventType.TOWN_HALL_CAPTURED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          player.townHallContributions += 1;
          player.townHallContributionUnits += this.nonNegativeNumber(payload.contributionUnits);
          break;
        case CivilizationEventType.TOWN_HALL_DEFENDED:
          player.actionsUsed += 1;
          player.actionPointUnitsSpent += actionPointUnitsSpent;
          player.townHallDefenses += 1;
          break;
        case CivilizationEventType.TEAM_GOLD_SPENT:
          player.goldSpent = new Prisma.Decimal(player.goldSpent)
            .add(this.nonNegativeDecimal(payload.amount))
            .toString();
          break;
      }
      statistics.set(event.actorPlayerId, player);
    }
    return statistics;
  }

  private emptyPlayerStatistics(): CivilizationPlayerStatistics {
    return {
      actionsUsed: 0,
      actionPointUnitsSpent: 0,
      cellsCaptured: 0,
      successfulPlayerAttacks: 0,
      failedPlayerAttacks: 0,
      buildingCaptureContributions: 0,
      buildingCaptureContributionUnits: 0,
      buildingsCaptured: 0,
      towerConstructionsStarted: 0,
      towersDestroyed: 0,
      towersRepaired: 0,
      townHallContributions: 0,
      townHallContributionUnits: 0,
      townHallDefenses: 0,
      goldSpent: '0',
    };
  }

  private nonNegativeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  }

  private nonNegativeDecimal(value: unknown): Prisma.Decimal {
    if (typeof value !== 'string' && typeof value !== 'number') return new Prisma.Decimal(0);
    try {
      const parsed = new Prisma.Decimal(value);
      return parsed.isNegative() ? new Prisma.Decimal(0) : parsed;
    } catch {
      return new Prisma.Decimal(0);
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private assertReadable(
    state: CivilizationStateRecord | null,
  ): asserts state is CivilizationStateRecord {
    if (!state) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.GAME_NOT_FOUND,
        'Civilization game was not found',
        404,
      );
    }
    if (state.status === CivilizationGameStatus.DRAFT) {
      throw new ForbiddenException('Draft Civilization games are only visible to administrators');
    }
  }
}
