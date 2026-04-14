import { ApiProperty } from '@nestjs/swagger';

export class BattlePlayerStatsDto {
  @ApiProperty({
    description: 'Final strength used in battle calculations',
    example: 22,
  })
  strength!: number;

  @ApiProperty({
    description: 'Final intelligence used in battle calculations',
    example: 14,
  })
  intelligence!: number;

  @ApiProperty({
    description: 'Final charisma used in battle calculations',
    example: 11,
  })
  charisma!: number;

  @ApiProperty({
    description: 'Final endurance used in battle calculations',
    example: 16,
  })
  endurance!: number;
}
