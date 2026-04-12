import { ApiProperty } from '@nestjs/swagger';

import { CreateItemResponseDto } from './create-item-response.dto';

export class PurchaseItemResponseDto {
  @ApiProperty({
    description: 'Purchased item state after ownership transfer',
    type: CreateItemResponseDto,
  })
  item!: CreateItemResponseDto;

  @ApiProperty({
    description: 'User balance after purchase',
    minimum: 0,
    example: 120,
  })
  balance!: number;
}
