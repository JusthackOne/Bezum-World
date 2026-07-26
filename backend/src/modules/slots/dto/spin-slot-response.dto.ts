import { ApiProperty } from '@nestjs/swagger';

import type { SlotSymbolId } from '../slots.constants';

export class SpinSlotResponseDto {
  @ApiProperty({
    description: 'Three symbols displayed on the center payline',
    enum: ['coin', 'potion', 'sword', 'crystal', 'crown', 'dragonEye'],
    isArray: true,
    minItems: 3,
    maxItems: 3,
    example: ['coin', 'coin', 'coin'],
  })
  result!: [SlotSymbolId, SlotSymbolId, SlotSymbolId];

  @ApiProperty({ description: 'Gold charged for the spin', example: 5 })
  bet!: number;

  @ApiProperty({ description: 'Gross Gold payout', example: 10 })
  payout!: number;

  @ApiProperty({ description: 'Payout minus bet', example: 5 })
  netChange!: number;

  @ApiProperty({ description: 'Whether the payline contains a winning combination', example: true })
  isWin!: boolean;
}
