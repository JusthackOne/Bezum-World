import { Injectable } from '@nestjs/common';
import { ItemRarity, type Item, type Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

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
        durability: input.durability,
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Item | null> {
    return this.getClient(tx).item.findUnique({
      where: { id },
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
