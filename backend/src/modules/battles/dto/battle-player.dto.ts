import { ApiProperty } from '@nestjs/swagger';

import { BattlePlayerEquipmentDto } from './battle-player-equipment.dto';
import { BattlePlayerStatsDto } from './battle-player-stats.dto';

export class BattlePlayerDto {
  @ApiProperty({
    description: 'Opponent user id',
    example: '2ad55bcf-4ee2-4a44-86cd-e62052d51a3f',
  })
  userId!: string;

  @ApiProperty({
    description: 'Opponent username',
    example: 'mike123',
  })
  username!: string;

  @ApiProperty({
    description: 'Opponent avatar URL',
    nullable: true,
    example: 'http://localhost:3000/uploads/avatars/avatar.jpg',
  })
  avatar!: string | null;

  @ApiProperty({
    description: 'Opponent equipment',
    type: BattlePlayerEquipmentDto,
  })
  equipment!: BattlePlayerEquipmentDto;

  @ApiProperty({
    description: 'Opponent final stats used in battle',
    type: BattlePlayerStatsDto,
  })
  stats!: BattlePlayerStatsDto;

  @ApiProperty({
    description: 'Chance for current user to win against this opponent in percent',
    example: 58.75,
  })
  winChancePercent!: number;

  @ApiProperty({
    description: 'GameScore reward current user receives if they win this battle',
    minimum: 0,
    maximum: 100,
    example: 41,
  })
  winGameScoreReward!: number;

  @ApiProperty({
    description: 'Gold reward current user receives if they win this battle',
    minimum: 0,
    maximum: 10,
    example: 4,
  })
  winGoldReward!: number;

  @ApiProperty({
    description: 'Whether current user can battle this opponent right now',
    example: true,
  })
  isBattleAvailableToday!: boolean;
}
