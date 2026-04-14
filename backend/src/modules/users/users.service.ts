import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Account } from '@prisma/client';

import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import {
  AccountRepository,
  type UpdateAccountInput,
} from '../auth/repositories/account.repository';
import { AdminDeleteUserResponseDto } from './dto/admin-delete-user-response.dto';
import { AdminUserWithCodeDto } from './dto/admin-user-with-code.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { PublicUserProfileDto } from './dto/public-user-profile.dto';
import { UserItemsResponseDto } from './dto/user-items-response.dto';
import { UserItemsRepository } from './repositories/user-items.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    private readonly userItemsRepository: UserItemsRepository,
    private readonly accountRepository: AccountRepository,
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

  async getAllUsersByAdmin(): Promise<AdminUserWithCodeDto[]> {
    const accounts = await this.accountRepository.findAllWithAuthCode();

    return accounts.map((account) => ({
      ...this.toAuthenticatedUser(account),
      code: account.authCode?.code ?? null,
    }));
  }

  async updateUserByAdmin(userId: string, payload: AdminUpdateUserDto): Promise<AuthenticatedUserDto> {
    const existingAccount = await this.accountRepository.findById(userId);

    if (!existingAccount) {
      throw new NotFoundException('User is not found');
    }

    const updateInput: UpdateAccountInput = {
      ...(payload.username !== undefined ? { username: payload.username } : {}),
      ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
      ...(payload.balance !== undefined ? { balance: payload.balance } : {}),
      ...(payload.strength !== undefined ? { strength: payload.strength } : {}),
      ...(payload.charisma !== undefined ? { charisma: payload.charisma } : {}),
      ...(payload.endurance !== undefined ? { endurance: payload.endurance } : {}),
      ...(payload.intelligence !== undefined ? { intelligence: payload.intelligence } : {}),
    };

    if (Object.keys(updateInput).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const updatedAccount = await this.accountRepository.updateById(userId, updateInput);

    return this.toAuthenticatedUser(updatedAccount);
  }

  async deleteUserByAdmin(userId: string): Promise<AdminDeleteUserResponseDto> {
    const isDeleted = await this.accountRepository.deleteById(userId);

    if (!isDeleted) {
      throw new NotFoundException('User is not found');
    }

    return {
      message: 'User deleted',
      userId,
    };
  }

  private toAuthenticatedUser(account: Account): AuthenticatedUserDto {
    return {
      id: account.id,
      username: account.username,
      avatarUrl: account.avatarUrl ?? null,
      balance: account.balance,
      strength: account.strength,
      charisma: account.charisma,
      endurance: account.endurance,
      intelligence: account.intelligence,
      lastTimeLoggedIn: account.lastTimeLoggedIn?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }
}
