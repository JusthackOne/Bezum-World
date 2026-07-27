import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { ITEM_LOCATION_VALUES, type ItemLocation } from '../types/item-location.type';
import { ITEM_SALE_SOURCE_VALUES, type ItemSaleSource } from '../types/item-sale-source.type';

export class GetItemsQueryDto {
  @ApiPropertyOptional({
    description: 'Optional location filter: shop (no owner) or inventory (has owner)',
    enum: ITEM_LOCATION_VALUES,
    example: 'shop',
  })
  @IsOptional()
  @IsIn(ITEM_LOCATION_VALUES)
  location?: ItemLocation;

  @ApiPropertyOptional({
    description:
      'Optional sale source filter: system items, all purchasable items, or player listings',
    enum: ITEM_SALE_SOURCE_VALUES,
    example: 'all',
  })
  @IsOptional()
  @IsIn(ITEM_SALE_SOURCE_VALUES)
  saleSource?: ItemSaleSource;
}
