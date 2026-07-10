import { EquipmentSlotType, ItemRarity, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface UserEquipment {
  item: {
    id: string;
    slotType: EquipmentSlotType;
    name: string;
    description: string | null;
    strength: number | null;
    charisma: number | null;
    intelligence: number | null;
    createdAt: Date;
    ownerUserId: string | null;
    imageUrl: string | null;
    agility: number | null;
    price: number;
    rarity: ItemRarity;
    durability: number | null;
  } | null;

  id: string;
  itemId: string | null;
  userId: string;
  slotType: EquipmentSlotType;
}

@Injectable()
export class UserEquipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async setEquipmentByItemIdForUser(
    itemId: string,
    slotType: EquipmentSlotType,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.getClient(tx).userEquipmentSlot.upsert({
      where: {
        userId_slotType: {
          userId,
          slotType,
        },
      },
      update: {
        itemId: itemId,
      },
      create: {
        userId,
        slotType,
        itemId,
      },
    });
  }

  async clearEquipmentByItemIdForUser(
    itemId: string,
    slotType: EquipmentSlotType,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await this.getClient(tx).userEquipmentSlot.updateMany({
      where: {
        userId,
        slotType,
        itemId,
      },
      data: {
        itemId: null,
      },
    });

    return result.count > 0;
  }

  async getEquipmentByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserEquipment[]> {
    return await this.getClient(tx).userEquipmentSlot.findMany({
      where: {
        userId,
      },
      include: {
        item: true,
      },
    });
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
