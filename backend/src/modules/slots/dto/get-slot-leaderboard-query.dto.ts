import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { SlotLeaderboardType } from '../types';

export class GetSlotLeaderboardQueryDto {
  @ApiPropertyOptional({
    description: 'Slot statistic used to rank users',
    enum: SlotLeaderboardType,
    example: SlotLeaderboardType.winnings,
  })
  @IsOptional()
  @IsEnum(SlotLeaderboardType)
  type?: SlotLeaderboardType;
}
