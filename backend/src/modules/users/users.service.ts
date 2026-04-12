import { Injectable, NotFoundException } from '@nestjs/common';

import { PublicUserProfileDto } from './dto/public-user-profile.dto';
import { UserItemsResponseDto } from './dto/user-items-response.dto';
import { UserItemsRepository } from './repositories/user-items.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    private readonly userItemsRepository: UserItemsRepository,
  ) {}

  async getPublicProfileByUsername(username: string): Promise<PublicUserProfileDto> {
    const normalizedUsername = username.trim();
    const account = await this.userProfileRepository.findByUsername(normalizedUsername);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    return {
      username: account.username,
      lastLoginAt: account.lastTimeLoggedIn?.toISOString() ?? null,
      profilePhoto: account.avatarUrl,
      attributes: {
        strength: account.strength,
        charisma: account.charisma,
        endurance: account.endurance,
        intelligence: account.intelligence,
      },
    };
  }

  async getUserItemsByUsername(username: string): Promise<UserItemsResponseDto> {
    const normalizedUsername = username.trim();
    const userItems = await this.userItemsRepository.findByUsername(normalizedUsername);

    if (!userItems) {
      throw new NotFoundException('User is not found');
    }

    return {
      username: userItems.username,
      items: userItems.items.map((item) => ({
        id: item.id,
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
      })),
    };
  }
}
