import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  CIVILIZATION_ACTIVATE_JOB,
  CIVILIZATION_COMPLETE_JOB,
  CIVILIZATION_COMPLETE_TOWER_JOB,
  CIVILIZATION_QUEUE,
  CIVILIZATION_RECONCILE_INTERVAL_MILLISECONDS,
  CIVILIZATION_RECONCILE_JOB,
  CIVILIZATION_RECONCILE_SCHEDULER_ID,
} from './civilization.constants';

@Injectable()
export class CivilizationScheduleService implements OnModuleInit {
  constructor(@InjectQueue(CIVILIZATION_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      CIVILIZATION_RECONCILE_SCHEDULER_ID,
      { every: CIVILIZATION_RECONCILE_INTERVAL_MILLISECONDS },
      {
        name: CIVILIZATION_RECONCILE_JOB,
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      },
    );
  }

  async scheduleGame(gameId: string, startAt: Date, endAt: Date): Promise<void> {
    await this.replaceDelayedJob(
      `civilization-activate-${gameId}`,
      CIVILIZATION_ACTIVATE_JOB,
      { gameId },
      startAt,
    );
    await this.replaceDelayedJob(
      `civilization-complete-${gameId}`,
      CIVILIZATION_COMPLETE_JOB,
      { gameId },
      endAt,
    );
  }

  async scheduleTower(towerId: string, gameId: string, completesAt: Date): Promise<void> {
    await this.replaceDelayedJob(
      `civilization-tower-${towerId}`,
      CIVILIZATION_COMPLETE_TOWER_JOB,
      { gameId, towerId },
      completesAt,
    );
  }

  private async replaceDelayedJob(
    jobId: string,
    name: string,
    data: Record<string, string>,
    runAt: Date,
  ): Promise<void> {
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (
        state === 'delayed' ||
        state === 'waiting' ||
        state === 'failed' ||
        state === 'completed'
      ) {
        await existing.remove();
      } else {
        return;
      }
    }
    await this.queue.add(name, data, {
      jobId,
      delay: Math.max(0, runAt.getTime() - Date.now()),
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }
}
