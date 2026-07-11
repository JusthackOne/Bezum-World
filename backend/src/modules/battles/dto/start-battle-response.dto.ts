import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StartBattleResponseDto {
  @ApiProperty({
    description: 'Battle result from current user perspective',
    enum: ['win', 'lose'],
    example: 'win',
  })
  result!: 'win' | 'lose';

  @ApiProperty({
    description: 'Gold reward added to the winner balance',
    minimum: 0,
    maximum: 10,
    example: 4,
  })
  transferredCoins!: number;

  @ApiPropertyOptional({
    description: 'GameScore reward for winner',
    example: 100,
  })
  gameScoreReward?: number;

  @ApiProperty({
    description: 'Current user balance after battle',
    example: 950,
  })
  updatedCurrentUserBalance!: number;

  @ApiProperty({
    description: 'Current user gameScore after battle',
    example: 2400,
  })
  updatedCurrentUserGameScore!: number;

  @ApiProperty({
    description: 'Whether battle against this opponent is available tomorrow',
    example: true,
  })
  battleAvailableTomorrow!: boolean;
}
