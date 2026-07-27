import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class ListItemForSaleDto {
  @ApiProperty({
    description: 'Player listing price in Gold',
    minimum: 0,
    maximum: 2_147_483_647,
    example: 250,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  price!: number;
}
