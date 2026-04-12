import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { ITEM_LOCATION_VALUES, type ItemLocation } from '../types/item-location.type';

export class GetItemsQueryDto {
  @ApiPropertyOptional({
    description: 'Optional location filter: shop (no owner) or inventory (has owner)',
    enum: ITEM_LOCATION_VALUES,
    example: 'shop',
  })
  @IsOptional()
  @IsIn(ITEM_LOCATION_VALUES)
  location?: ItemLocation;
}
