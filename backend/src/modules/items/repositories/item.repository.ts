import { Injectable } from '@nestjs/common';
import { EquipmentSlotType, ItemRarity, type Item, type Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import type { ItemLocation } from '../types/item-location.type';
import type { ItemSaleSource } from '../types/item-sale-source.type';

export type ItemWithSeller = Prisma.ItemGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
  };
}>;

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

export interface UpdateItemInput {
  name: string;
  description: string | null;
  imageUrl?: string | null;
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

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<ItemWithSeller | null> {
    return this.getClient(tx).item.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
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

  async updateById(id: string, input: UpdateItemInput): Promise<Item | null> {
    const result = await this.prisma.item.updateMany({
      where: {
        id,
      },
      data: {
        name: input.name,
        description: input.description,
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
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

    if (result.count === 0) {
      return null;
    }

    return this.findById(id);
  }

  async findAll(location?: ItemLocation, saleSource?: ItemSaleSource): Promise<ItemWithSeller[]> {
    const where = this.buildItemsWhere(location, saleSource);
    return this.prisma.item.findMany({
      ...(where ? { where } : {}),
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
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
        isListedForSale: false,
        listingPrice: null,
      },
    });

    return result.count > 0;
  }

  async setListingIfOwned(
    id: string,
    ownerUserId: string,
    expectedListingState: boolean,
    listingPrice: number | null,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await this.getClient(tx).item.updateMany({
      where: {
        id,
        ownerUserId,
        isListedForSale: expectedListingState,
      },
      data: {
        isListedForSale: !expectedListingState,
        listingPrice,
      },
    });

    return result.count > 0;
  }

  async transferListedItem(
    id: string,
    sellerUserId: string,
    buyerUserId: string,
    listingPrice: number,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await this.getClient(tx).item.updateMany({
      where: {
        id,
        ownerUserId: sellerUserId,
        isListedForSale: true,
        listingPrice,
      },
      data: {
        ownerUserId: buyerUserId,
        isListedForSale: false,
        listingPrice: null,
      },
    });

    return result.count > 0;
  }

  async clearEquipmentReference(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).userEquipmentSlot.deleteMany({
      where: {
        itemId: id,
      },
    });
  }

  private buildItemsWhere(
    location?: ItemLocation,
    saleSource?: ItemSaleSource,
  ): Prisma.ItemWhereInput | undefined {
    if (saleSource === 'players') {
      return {
        ownerUserId: { not: null },
        isListedForSale: true,
        listingPrice: { not: null },
      };
    }

    if (saleSource === 'all') {
      return {
        OR: [
          { ownerUserId: null },
          {
            ownerUserId: { not: null },
            isListedForSale: true,
            listingPrice: { not: null },
          },
        ],
      };
    }

    if (saleSource === 'system' || location === 'shop') {
      return { ownerUserId: null };
    }

    if (location === 'inventory') {
      return { ownerUserId: { not: null } };
    }

    return undefined;
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
