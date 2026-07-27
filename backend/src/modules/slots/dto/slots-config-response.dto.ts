import { ApiProperty } from '@nestjs/swagger';

import { SlotSymbolDto } from './slot-symbol.dto';

export class SlotsConfigResponseDto {
  @ApiProperty({ description: 'Gold charged per spin', example: 5 })
  bet!: number;

  @ApiProperty({ description: 'Return to player in basis points', example: 9700 })
  rtpBps!: number;

  @ApiProperty({ description: 'Probability of any win in basis points', example: 2595 })
  hitRateBps!: number;

  @ApiProperty({ type: SlotSymbolDto, isArray: true })
  symbols!: SlotSymbolDto[];
}
