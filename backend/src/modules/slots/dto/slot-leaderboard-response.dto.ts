import { ApiProperty } from '@nestjs/swagger';

import { SlotLeaderboardType } from '../types';
import { SlotLeaderboardEntryDto } from './slot-leaderboard-entry.dto';

export class SlotLeaderboardResponseDto {
  @ApiProperty({ enum: SlotLeaderboardType })
  type!: SlotLeaderboardType;

  @ApiProperty({ type: [SlotLeaderboardEntryDto] })
  leaders!: SlotLeaderboardEntryDto[];
}
