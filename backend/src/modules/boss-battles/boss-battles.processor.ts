import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  ACTIVATE_JOB,
  BOSS_BATTLES_QUEUE,
  EXPIRE_JOB,
  FINALIZE_JOB,
} from './boss-battles.constants';
import { BossBattlesService } from './boss-battles.service';

@Processor(BOSS_BATTLES_QUEUE)
export class BossBattlesProcessor extends WorkerHost {
  constructor(private readonly service: BossBattlesService) {
    super();
  }
  async process(job: Job<{ battleId: string }>): Promise<void> {
    if (job.name === ACTIVATE_JOB) await this.service.activate(job.data.battleId);
    else if (job.name === EXPIRE_JOB) await this.service.expire(job.data.battleId);
    else if (job.name === FINALIZE_JOB) await this.service.finalize(job.data.battleId);
  }
}
