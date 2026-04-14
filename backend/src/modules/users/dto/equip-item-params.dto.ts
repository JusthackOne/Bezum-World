import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class EquipItemByUserParamsDto {
  @ApiProperty({
    description: 'Equip item by user',
    example: 'itemid',
  })
  @IsString()
  itemId!: string;
}
