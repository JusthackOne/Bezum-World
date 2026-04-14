import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { LeaderboardPeriod } from '../types/leaderboard-period.type';

export class GetLeaderboardQueryDto {
  @ApiPropertyOptional({
    description: 'Leaderboard period',
    enum: LeaderboardPeriod,
    example: LeaderboardPeriod.all,
  })
  @IsOptional()
  @IsEnum(LeaderboardPeriod)
  period?: LeaderboardPeriod;
}

