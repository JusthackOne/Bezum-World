import { EquipmentSlotType, ItemRarity } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type UserItemType = 'helmet' | 'chest' | 'pants' | 'boots' | 'weapon';

export class UserOwnedItemDto {
  @ApiProperty({
    description: 'Unique item identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  id!: string;

  @ApiProperty({
    description: 'Item name',
    example: 'Sigma Sword',
  })
  name!: string;

  @ApiProperty({
    description: 'Logical item type used by equipment UI',
    enum: ['helmet', 'chest', 'pants', 'boots', 'weapon'],
    example: 'weapon',
  })
  type!: UserItemType;

  @ApiProperty({
    description: 'Concrete equipment slot type from database',
    enum: EquipmentSlotType,
    example: EquipmentSlotType.RIGHT_HAND,
  })
  slot_type!: EquipmentSlotType;

  @ApiPropertyOptional({
    description: 'Item description',
    nullable: true,
    example: 'A powerful and rare sword',
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Public image URL',
    nullable: true,
    example: 'https://example.com/sword.png',
  })
  image_url!: string | null;

  @ApiPropertyOptional({
    description: 'Strength modifier in range 0..100',
    nullable: true,
    minimum: 0,
    maximum: 100,
    example: 80,
  })
  strength!: number | null;

  @ApiPropertyOptional({
    description: 'Charisma modifier in range 0..100',
    nullable: true,
    minimum: 0,
    maximum: 100,
    example: 10,
  })
  charisma!: number | null;

  @ApiPropertyOptional({
    description: 'Agility modifier in range 0..100',
    nullable: true,
    minimum: 0,
    maximum: 100,
    example: 25,
  })
  agility!: number | null;

  @ApiPropertyOptional({
    description: 'Intelligence modifier in range 0..100',
    nullable: true,
    minimum: 0,
    maximum: 100,
    example: 5,
  })
  intelligence!: number | null;

  @ApiProperty({
    description: 'Item price in range 0..1000',
    minimum: 0,
    maximum: 1000,
    example: 500,
  })
  price!: number;

  @ApiProperty({
    description: 'Item rarity level',
    enum: ItemRarity,
    example: ItemRarity.sigma,
  })
  rarity!: ItemRarity;

  @ApiPropertyOptional({
    description: 'Durability in range 0..100',
    nullable: true,
    minimum: 0,
    maximum: 100,
    example: 100,
  })
  durability!: number | null;

  @ApiProperty({
    description: 'Item creation time',
    example: '2026-04-12T12:10:00.000Z',
  })
  created_at!: string;
}
