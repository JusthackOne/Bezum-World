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
    isListedForSale: boolean;
    listingPrice: number | null;
    rarity: ItemRarity;
    durability: number | null;
  } | null;

  id: string;
  itemId: string | null;
  userId: string;
  slotType: EquipmentSlotType;
  position: number;
}

const MAX_EQUIPPED_ACCESSORIES = 4;

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
        userId_slotType_position: {
          userId,
          slotType,
          position: 0,
        },
      },
      update: {
        itemId: itemId,
      },
      create: {
        userId,
        slotType,
        position: 0,
        itemId,
      },
    });
  }

  async addAccessoryByItemIdForUser(
    itemId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    await this.lockUserEquipment(userId, tx);

    const equippedAccessories = await tx.userEquipmentSlot.findMany({
      where: {
        userId,
        slotType: EquipmentSlotType.ACCESSORY,
        itemId: { not: null },
      },
      select: {
        itemId: true,
        position: true,
      },
      orderBy: {
        position: 'asc',
      },
    });

    if (equippedAccessories.some((slot) => slot.itemId === itemId)) {
      return true;
    }

    if (equippedAccessories.length >= MAX_EQUIPPED_ACCESSORIES) {
      return false;
    }

    const occupiedPositions = new Set(equippedAccessories.map((slot) => slot.position));
    const firstAvailablePosition = Array.from(
      { length: MAX_EQUIPPED_ACCESSORIES },
      (_, position) => position,
    ).find((position) => !occupiedPositions.has(position));

    if (firstAvailablePosition === undefined) {
      return false;
    }

    await tx.userEquipmentSlot.create({
      data: {
        userId,
        slotType: EquipmentSlotType.ACCESSORY,
        position: firstAvailablePosition,
        itemId,
      },
    });

    return true;
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

  async removeAccessoryByItemIdForUser(
    itemId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    await this.lockUserEquipment(userId, tx);

    const equippedAccessory = await tx.userEquipmentSlot.findFirst({
      where: {
        userId,
        slotType: EquipmentSlotType.ACCESSORY,
        itemId,
      },
      select: {
        id: true,
        position: true,
      },
    });

    if (!equippedAccessory) {
      return false;
    }

    await tx.userEquipmentSlot.delete({
      where: {
        id: equippedAccessory.id,
      },
    });

    const laterAccessories = await tx.userEquipmentSlot.findMany({
      where: {
        userId,
        slotType: EquipmentSlotType.ACCESSORY,
        position: { gt: equippedAccessory.position },
      },
      select: {
        id: true,
      },
      orderBy: {
        position: 'asc',
      },
    });

    for (const accessory of laterAccessories) {
      await tx.userEquipmentSlot.update({
        where: { id: accessory.id },
        data: { position: { decrement: 1 } },
      });
    }

    return true;
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
      orderBy: [{ slotType: 'asc' }, { position: 'asc' }],
    });
  }

  private async lockUserEquipment(userId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "Account"
      WHERE "id" = ${userId}
      FOR UPDATE
    `);
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
