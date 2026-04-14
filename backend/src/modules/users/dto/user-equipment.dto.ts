import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { UserOwnedItemDto } from './user-owned-item.dto';

export class UserEquipmentDto {
  @ApiPropertyOptional({
    description: 'Equipped helmet item',
    type: UserOwnedItemDto,
  })
  helmet?: UserOwnedItemDto;

  @ApiPropertyOptional({
    description: 'Equipped chest item',
    type: UserOwnedItemDto,
  })
  chest?: UserOwnedItemDto;

  @ApiPropertyOptional({
    description: 'Equipped pants item',
    type: UserOwnedItemDto,
  })
  pants?: UserOwnedItemDto;

  @ApiPropertyOptional({
    description: 'Equipped boots item',
    type: UserOwnedItemDto,
  })
  boots?: UserOwnedItemDto;

  @ApiPropertyOptional({
    description: 'Equipped left-hand weapon or shield',
    type: UserOwnedItemDto,
  })
  leftWeapon?: UserOwnedItemDto;

  @ApiPropertyOptional({
    description: 'Equipped right-hand weapon',
    type: UserOwnedItemDto,
  })
  rightWeapon?: UserOwnedItemDto;
}

export class EquipItemByUserResponse {
  @ApiProperty({
    description: 'Current equipment after equip action',
    type: UserEquipmentDto,
  })
  equipped!: UserEquipmentDto;
}
