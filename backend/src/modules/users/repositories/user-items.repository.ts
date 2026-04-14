import { EquipmentSlotType, ItemRarity } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface UserOwnedItemRecord {
  id: string;
  name: string;
  slotType: EquipmentSlotType;
  description: string | null;
  imageUrl: string | null;
  strength: number | null;
  charisma: number | null;
  agility: number | null;
  intelligence: number | null;
  price: number;
  rarity: ItemRarity;
  durability: number | null;
  createdAt: Date;
}

export interface UserItemsRecord {
  username: string;
  items: UserOwnedItemRecord[];
}

@Injectable()
export class UserItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<UserItemsRecord | null> {
    return this.prisma.account.findFirst({
      where: { username },
      select: {
        username: true,
        items: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slotType: true,
            description: true,
            imageUrl: true,
            strength: true,
            charisma: true,
            agility: true,
            intelligence: true,
            price: true,
            rarity: true,
            durability: true,
            createdAt: true,
          },
        },
      },
    });
  }
}
