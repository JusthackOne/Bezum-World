import { ApiProperty } from '@nestjs/swagger';

import { LeaderboardPeriod } from '../types/leaderboard-period.type';
import { LeaderboardLeaderDto } from './leaderboard-leader.dto';

export class LeaderboardResponseDto {
  @ApiProperty({
    description: 'Selected leaderboard period',
    enum: LeaderboardPeriod,
    example: LeaderboardPeriod.weekly,
  })
  period!: LeaderboardPeriod;

  @ApiProperty({
    description: 'Ordered leaderboard leaders list',
    type: [LeaderboardLeaderDto],
  })
  leaders!: LeaderboardLeaderDto[];
}
