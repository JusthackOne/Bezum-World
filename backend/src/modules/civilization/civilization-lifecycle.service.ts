import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameSnapshotType,
  CivilizationGameStatus,
  CivilizationTowerStatus,
  CivilizationTowerWorkKind,
} from '@prisma/client';

import { CivilizationCompletionService } from './civilization-completion.service';
import { CivilizationConnectivityService } from './civilization-connectivity.service';
import { CivilizationQueryService } from './civilization-query.service';
import { CivilizationRuntimeService } from './civilization-runtime.service';
import { CivilizationScheduleService } from './civilization-schedule.service';
import { serializeCivilizationSnapshot } from './civilization-snapshot';
import { CivilizationRepository } from './repositories';

@Injectable()
export class CivilizationLifecycleService implements OnModuleInit {
  constructor(
    private readonly repository: CivilizationRepository,
    private readonly connectivityService: CivilizationConnectivityService,
    private readonly completionService: CivilizationCompletionService,
    private readonly queryService: CivilizationQueryService,
    private readonly scheduleService: CivilizationScheduleService,
    private readonly runtime: CivilizationRuntimeService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reconcile();
  }

  async reconcile(): Promise<void> {
    const now = this.runtime.now();
    const games = await this.repository.findGamesForReconciliation();
    for (const game of games) {
      if (
        game.status === CivilizationGameStatus.SCHEDULED &&
        game.startAt.getTime() <= now.getTime()
      ) {
        await this.activateGame(game.id);
      } else if (
        game.status === CivilizationGameStatus.ACTIVE &&
        game.endAt.getTime() <= now.getTime()
      ) {
        await this.completeAtEnd(game.id);
      } else {
        await this.scheduleService.scheduleGame(game.id, game.startAt, game.endAt);
      }
    }

    const towers = await this.repository.findTowersForReconciliation();
    for (const tower of towers) {
      if (!tower.constructionCompletesAt) continue;
      if (tower.constructionCompletesAt.getTime() <= now.getTime()) {
        await this.completeTower(tower.gameId, tower.id);
      } else {
        await this.scheduleService.scheduleTower(
          tower.id,
          tower.gameId,
          tower.constructionCompletesAt,
        );
      }
    }
  }

  async activateGame(gameId: string): Promise<void> {
    const towersToSchedule = await this.repository.transaction(async (tx) => {
      await this.repository.lockGameState(gameId, tx);
      let state = await this.repository.findStateById(gameId, tx);
      if (!state || state.status !== CivilizationGameStatus.SCHEDULED) return [];
      const now = this.runtime.now();
      if (now.getTime() < state.startAt.getTime()) return [];

      await this.repository.updateGame(
        gameId,
        { status: CivilizationGameStatus.ACTIVE, stateVersion: { increment: 1 } },
        tx,
      );
      state = await this.connectivityService.recalculate(gameId, state.startAt, tx);

      const pendingTowerJobs: Array<{ towerId: string; completesAt: Date }> = [];
      for (const tower of state.towers.filter(
        (candidate) => candidate.status === CivilizationTowerStatus.UNDER_CONSTRUCTION,
      )) {
        if (!tower.constructionCompletesAt) continue;
        if (tower.constructionCompletesAt.getTime() > state.endAt.getTime()) continue;
        if (tower.constructionCompletesAt.getTime() > now.getTime()) {
          pendingTowerJobs.push({
            towerId: tower.id,
            completesAt: tower.constructionCompletesAt,
          });
          continue;
        }
        const tile = state.tiles.find((candidate) => candidate.id === tower.tileId);
        const completed = tile?.ownerTeamId === tower.teamId;
        await this.repository.updateTower(
          tower.id,
          {
            status: completed ? CivilizationTowerStatus.ACTIVE : CivilizationTowerStatus.CANCELLED,
            workKind: null,
          },
          tx,
        );
        await this.repository.createEvent(
          {
            gameId,
            teamId: tower.teamId,
            tileId: tower.tileId,
            eventType: completed
              ? tower.workKind === CivilizationTowerWorkKind.REPAIR
                ? CivilizationEventType.TOWER_REPAIRED
                : CivilizationEventType.TOWER_COMPLETED
              : CivilizationEventType.TOWER_CONSTRUCTION_CANCELLED,
            payload: {
              towerId: tower.id,
              reconciledAtActivation: true,
              ...(completed ? { connected: tile?.isConnected ?? false } : { refund: '0' }),
            },
          },
          tx,
        );
      }
      state = (await this.repository.findStateById(gameId, tx))!;
      await this.repository.createEvent(
        {
          gameId,
          eventType: CivilizationEventType.GAME_STARTED,
          payload: {
            scheduledStartAt: state.startAt.toISOString(),
            activatedAt: now.toISOString(),
          },
        },
        tx,
      );
      await this.repository.createSnapshot(
        gameId,
        CivilizationGameSnapshotType.STARTED,
        serializeCivilizationSnapshot(state),
        tx,
      );

      if (now.getTime() >= state.endAt.getTime()) {
        await this.completionService.completeInTransaction(
          gameId,
          CivilizationCompletionReason.END_TIME_REACHED,
          null,
          state.endAt,
          tx,
        );
        return [];
      }
      return pendingTowerJobs;
    });
    for (const tower of towersToSchedule) {
      await this.scheduleService.scheduleTower(tower.towerId, gameId, tower.completesAt);
    }
  }

  async completeAtEnd(gameId: string): Promise<void> {
    let state = await this.repository.findStateById(gameId);
    if (!state || state.status !== CivilizationGameStatus.ACTIVE) return;
    const now = this.runtime.now();
    if (now.getTime() < state.endAt.getTime()) return;
    const configuredEndAt = state.endAt;
    for (const tower of state.towers.filter(
      (candidate) =>
        candidate.status === CivilizationTowerStatus.UNDER_CONSTRUCTION &&
        candidate.constructionCompletesAt !== null &&
        candidate.constructionCompletesAt.getTime() <= configuredEndAt.getTime(),
    )) {
      await this.completeTower(gameId, tower.id, configuredEndAt);
    }
    state = await this.repository.findStateById(gameId);
    if (!state || state.status !== CivilizationGameStatus.ACTIVE) return;
    await this.completionService.completeGame(
      gameId,
      CivilizationCompletionReason.END_TIME_REACHED,
    );
  }

  async completeTower(gameId: string, towerId: string, completeAsOf?: Date): Promise<void> {
    await this.repository.transaction(async (tx) => {
      await this.repository.lockGameState(gameId, tx);
      const state = await this.repository.findStateById(gameId, tx);
      if (!state || state.status !== CivilizationGameStatus.ACTIVE) return;
      const tower = state.towers.find((candidate) => candidate.id === towerId);
      const now = this.runtime.now();
      const completionCutoff = completeAsOf ?? now;
      if (
        !tower ||
        tower.status !== CivilizationTowerStatus.UNDER_CONSTRUCTION ||
        !tower.constructionCompletesAt ||
        tower.constructionCompletesAt.getTime() > completionCutoff.getTime() ||
        tower.constructionCompletesAt.getTime() > state.endAt.getTime() ||
        (!completeAsOf && now.getTime() >= state.endAt.getTime())
      ) {
        return;
      }
      const tile = state.tiles.find((candidate) => candidate.id === tower.tileId);
      if (tile?.ownerTeamId !== tower.teamId) {
        await this.repository.updateTower(
          tower.id,
          { status: CivilizationTowerStatus.CANCELLED, workKind: null },
          tx,
        );
        await this.repository.createEvent(
          {
            gameId,
            teamId: tower.teamId,
            tileId: tower.tileId,
            eventType: CivilizationEventType.TOWER_CONSTRUCTION_CANCELLED,
            payload: { towerId, reason: 'TILE_NOT_OWNED_AT_COMPLETION', refund: '0' },
          },
          tx,
        );
      } else {
        await this.repository.updateTower(
          tower.id,
          { status: CivilizationTowerStatus.ACTIVE, workKind: null },
          tx,
        );
        await this.repository.createEvent(
          {
            gameId,
            teamId: tower.teamId,
            tileId: tower.tileId,
            eventType:
              tower.workKind === CivilizationTowerWorkKind.REPAIR
                ? CivilizationEventType.TOWER_REPAIRED
                : CivilizationEventType.TOWER_COMPLETED,
            payload: {
              towerId,
              connected: tile.isConnected,
              workKind: tower.workKind,
            },
          },
          tx,
        );
      }
      await this.repository.updateGame(gameId, { stateVersion: { increment: 1 } }, tx);
    });
  }
}
