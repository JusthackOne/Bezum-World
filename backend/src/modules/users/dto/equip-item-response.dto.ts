import { EquipmentSlotType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { UserOwnedItemDto } from './user-owned-item.dto';

export class EquipItemByUserResponse {
  @ApiProperty({
    description: 'Equipped items grouped by slot type',
    example: {
      RIGHT_HAND: {
        id: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
        name: 'Sigma Sword',
        description: 'A powerful and rare sword',
        image_url: 'http://localhost:3000/uploads/items/example.png',
        strength: 80,
        charisma: 10,
        agility: 25,
        intelligence: 5,
        price: 500,
        rarity: 'sigma',
        durability: 100,
        created_at: '2026-04-12T12:10:00.000Z',
      },
    },
  })
  equipment!: Partial<Record<EquipmentSlotType, UserOwnedItemDto>>;
}
