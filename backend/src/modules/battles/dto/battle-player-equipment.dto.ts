import { ApiPropertyOptional } from '@nestjs/swagger';

import { BattleEquipmentItemDto } from './battle-equipment-item.dto';

export class BattlePlayerEquipmentDto {
  @ApiPropertyOptional({
    description: 'Equipped helmet',
    type: BattleEquipmentItemDto,
  })
  helmet?: BattleEquipmentItemDto;

  @ApiPropertyOptional({
    description: 'Equipped chest',
    type: BattleEquipmentItemDto,
  })
  chest?: BattleEquipmentItemDto;

  @ApiPropertyOptional({
    description: 'Equipped pants',
    type: BattleEquipmentItemDto,
  })
  pants?: BattleEquipmentItemDto;

  @ApiPropertyOptional({
    description: 'Equipped boots',
    type: BattleEquipmentItemDto,
  })
  boots?: BattleEquipmentItemDto;

  @ApiPropertyOptional({
    description: 'Equipped left hand item',
    type: BattleEquipmentItemDto,
  })
  leftWeapon?: BattleEquipmentItemDto;

  @ApiPropertyOptional({
    description: 'Equipped right hand item',
    type: BattleEquipmentItemDto,
  })
  rightWeapon?: BattleEquipmentItemDto;
}
