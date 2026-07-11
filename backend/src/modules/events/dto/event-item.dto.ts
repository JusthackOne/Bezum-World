import { ApiProperty } from '@nestjs/swagger';
import { EquipmentSlotType, ItemRarity } from '@prisma/client';

export class EventItemDto {
  @ApiProperty({ example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3' })
  id!: string;

  @ApiProperty({ example: 'Dark Ritual Blade' })
  name!: string;

  @ApiProperty({ example: 'Sharp blade', nullable: true })
  description!: string | null;

  @ApiProperty({ example: '/uploads/items/blade.jpg', nullable: true })
  image_url!: string | null;

  @ApiProperty({ example: 10, nullable: true })
  strength!: number | null;

  @ApiProperty({ example: 3, nullable: true })
  charisma!: number | null;

  @ApiProperty({ example: 2, nullable: true })
  agility!: number | null;

  @ApiProperty({ example: 4, nullable: true })
  intelligence!: number | null;

  @ApiProperty({ example: 25 })
  price!: number;

  @ApiProperty({ enum: ItemRarity, example: ItemRarity.sigma })
  rarity!: ItemRarity;

  @ApiProperty({ enum: EquipmentSlotType, example: EquipmentSlotType.RIGHT_HAND })
  slotType!: EquipmentSlotType;

  @ApiProperty({ example: 100, nullable: true })
  durability!: number | null;

  @ApiProperty({ example: '2026-07-11T11:10:00.000Z' })
  created_at!: string;
}
