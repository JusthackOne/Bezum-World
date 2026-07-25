import { ApiProperty } from '@nestjs/swagger';

import type { SlotSymbolId } from '../slots.constants';

export class SlotSymbolDto {
  @ApiProperty({
    description: 'Stable symbol identifier',
    enum: ['coin', 'potion', 'sword', 'crystal', 'crown', 'dragonEye'],
    example: 'coin',
  })
  id!: SlotSymbolId;

  @ApiProperty({ example: 'Star Coin' })
  label!: string;

  @ApiProperty({ example: 'COIN' })
  shortLabel!: string;

  @ApiProperty({ description: 'Gross payout multiplier', example: 2 })
  payoutMultiplier!: number;

  @ApiProperty({ description: 'Gross payout for the configured bet', example: 10 })
  payout!: number;

  @ApiProperty({ description: 'Win probability in basis points', example: 1400 })
  chanceBps!: number;
}
