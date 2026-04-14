import { Injectable } from '@nestjs/common';
import { EquipmentSlotType, ItemRarity, type Item, type Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type { ItemLocation } from '../types/item-location.type';

export interface CreateItemInput {
  ownerUserId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  strength: number | null;
  charisma: number | null;
  agility: number | null;
  intelligence: number | null;
  price: number;
  rarity: ItemRarity;
  slotType: EquipmentSlotType;
  durability: number | null;
}

@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateItemInput, tx?: Prisma.TransactionClient): Promise<Item> {
    return this.getClient(tx).item.create({
      data: {
        ownerUserId: input.ownerUserId,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        strength: input.strength,
        charisma: input.charisma,
        agility: input.agility,
        intelligence: input.intelligence,
        price: input.price,
        rarity: input.rarity,
        slotType: input.slotType,
        durability: input.durability,
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Item | null> {
    return this.getClient(tx).item.findUnique({
      where: { id },
    });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.prisma.item.deleteMany({
      where: {
        id,
      },
    });

    return result.count > 0;
  }

  async findAll(location?: ItemLocation): Promise<Item[]> {
    const where: Prisma.ItemWhereInput | undefined =
      location === 'shop'
        ? { ownerUserId: null }
        : location === 'inventory'
          ? { ownerUserId: { not: null } }
          : undefined;

    if (where) {
      return this.prisma.item.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return this.prisma.item.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async assignOwnerIfUnowned(
    id: string,
    ownerUserId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await this.getClient(tx).item.updateMany({
      where: {
        id,
        ownerUserId: null,
      },
      data: {
        ownerUserId,
      },
    });

    return result.count > 0;
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
