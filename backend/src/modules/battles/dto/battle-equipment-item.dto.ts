import { EquipmentSlotType, ItemRarity } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BattleEquipmentItemDto {
  @ApiProperty({
    description: 'Item identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  id!: string;

  @ApiProperty({
    description: 'Item name',
    example: 'Sigma Sword',
  })
  name!: string;

  @ApiProperty({
    description: 'Database equipment slot type',
    enum: EquipmentSlotType,
    example: EquipmentSlotType.RIGHT_HAND,
  })
  slot_type!: EquipmentSlotType;

  @ApiPropertyOptional({
    description: 'Item description',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Public image URL',
    nullable: true,
  })
  image_url!: string | null;

  @ApiPropertyOptional({
    description: 'Strength bonus',
    nullable: true,
  })
  strength!: number | null;

  @ApiPropertyOptional({
    description: 'Charisma bonus',
    nullable: true,
  })
  charisma!: number | null;

  @ApiPropertyOptional({
    description: 'Agility bonus',
    nullable: true,
  })
  agility!: number | null;

  @ApiPropertyOptional({
    description: 'Intelligence bonus',
    nullable: true,
  })
  intelligence!: number | null;

  @ApiProperty({
    description: 'Price',
    example: 120,
  })
  price!: number;

  @ApiProperty({
    description: 'Rarity',
    enum: ItemRarity,
    example: ItemRarity.sigma,
  })
  rarity!: ItemRarity;

  @ApiPropertyOptional({
    description: 'Durability',
    nullable: true,
  })
  durability!: number | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-04-12T12:10:00.000Z',
  })
  created_at!: string;
}
