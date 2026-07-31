import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import {
  CIVILIZATION_ACTIVATE_JOB,
  CIVILIZATION_COMPLETE_JOB,
  CIVILIZATION_COMPLETE_TOWER_JOB,
  CIVILIZATION_QUEUE,
  CIVILIZATION_RECONCILE_JOB,
} from './civilization.constants';
import { CivilizationLifecycleService } from './civilization-lifecycle.service';

interface CivilizationJobData {
  gameId?: string;
  towerId?: string;
}

@Processor(CIVILIZATION_QUEUE)
export class CivilizationProcessor extends WorkerHost {
  constructor(private readonly lifecycleService: CivilizationLifecycleService) {
    super();
  }

  async process(job: Job<CivilizationJobData>): Promise<void> {
    if (job.name === CIVILIZATION_RECONCILE_JOB) {
      await this.lifecycleService.reconcile();
      return;
    }
    if (job.name === CIVILIZATION_ACTIVATE_JOB && job.data.gameId) {
      await this.lifecycleService.activateGame(job.data.gameId);
      return;
    }
    if (job.name === CIVILIZATION_COMPLETE_JOB && job.data.gameId) {
      await this.lifecycleService.completeAtEnd(job.data.gameId);
      return;
    }
    if (job.name === CIVILIZATION_COMPLETE_TOWER_JOB && job.data.gameId && job.data.towerId) {
      await this.lifecycleService.completeTower(job.data.gameId, job.data.towerId);
    }
  }
}
