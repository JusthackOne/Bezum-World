import { Injectable } from '@nestjs/common';

import { CreateItemDto } from './dto/create-item.dto';
import { CreateItemResponseDto } from './dto/create-item-response.dto';
import { ItemRepository } from './repositories/item.repository';

@Injectable()
export class ItemsService {
  constructor(private readonly itemRepository: ItemRepository) {}

  async createByAdmin(payload: CreateItemDto): Promise<CreateItemResponseDto> {
    const item = await this.itemRepository.create({
      ownerUserId: null,
      name: payload.name,
      description: payload.description ?? null,
      imageUrl: payload.image_url ?? null,
      strength: payload.strength ?? null,
      charisma: payload.charisma ?? null,
      agility: payload.agility ?? null,
      intelligence: payload.intelligence ?? null,
      price: payload.price,
      rarity: payload.rarity,
      durability: payload.durability ?? null,
    });

    return {
      id: item.id,
      owner_user_id: item.ownerUserId,
      name: item.name,
      description: item.description,
      image_url: item.imageUrl,
      strength: item.strength,
      charisma: item.charisma,
      agility: item.agility,
      intelligence: item.intelligence,
      price: item.price,
      rarity: item.rarity,
      durability: item.durability,
      created_at: item.createdAt.toISOString(),
    };
  }
}
