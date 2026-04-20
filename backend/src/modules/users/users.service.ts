import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EquipmentSlotType, Prisma, type Account } from '@prisma/client';

import { AuthenticatedUserDto } from '../auth/dto';
import { AccountRepository, type UpdateAccountInput } from '../auth/repositories';
import {
  AdminDeleteUserResponseDto,
  AdminUpdateUserDto,
  AdminUserWithCodeDto,
  type UserEquipmentDto,
  EquipItemByUserResponse,
  PublicUserProfileDto,
  UserOwnedItemDto,
  UserItemsResponseDto,
} from './dto';
import {
  UserEquipmentRepository,
  UserItemsRepository,
  UserProfileRepository,
} from './repositories';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ItemRepository } from '../items/repositories';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRepository: ItemRepository,
    private readonly userProfileRepository: UserProfileRepository,
    private readonly userItemsRepository: UserItemsRepository,
    private readonly userEquipmentRepository: UserEquipmentRepository,
    private readonly accountRepository: AccountRepository,
    private readonly configService: ConfigService,
  ) {}

  async getPublicProfileByUsername(username: string): Promise<PublicUserProfileDto> {
    const normalizedUsername = username.trim();
    const account = await this.userProfileRepository.findByUsername(normalizedUsername);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    return {
      id: account.id,
      username: account.username,
      lastLoginAt: account.lastTimeLoggedIn?.toISOString() ?? null,
      profilePhoto: account.avatarUrl,
      balance: account.balance,
      gameScore: account.gameScore,
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
      items: userItems.items.map((item) => this.toUserOwnedItem(item)),
    };
  }

  async getAllUsersByAdmin(): Promise<AdminUserWithCodeDto[]> {
    const accounts = await this.accountRepository.findAllWithAuthCode();

    return accounts.map((account) => ({
      ...this.toAuthenticatedUser(account),
      code: account.authCode?.code ?? null,
    }));
  }

  async updateUserByAdmin(
    userId: string,
    payload: AdminUpdateUserDto,
    uploadedAvatarUrl?: string,
  ): Promise<AuthenticatedUserDto> {
    const existingAccount = await this.accountRepository.findById(userId);

    if (!existingAccount) {
      throw new NotFoundException('User is not found');
    }

    const updateInput: UpdateAccountInput = {
      ...(payload.username !== undefined ? { username: payload.username } : {}),
      ...(uploadedAvatarUrl !== undefined
        ? { avatarUrl: uploadedAvatarUrl }
        : payload.avatarUrl !== undefined
          ? { avatarUrl: payload.avatarUrl }
          : {}),
      ...(payload.balance !== undefined ? { balance: payload.balance } : {}),
      ...(payload.strength !== undefined ? { strength: payload.strength } : {}),
      ...(payload.charisma !== undefined ? { charisma: payload.charisma } : {}),
      ...(payload.endurance !== undefined ? { endurance: payload.endurance } : {}),
      ...(payload.intelligence !== undefined ? { intelligence: payload.intelligence } : {}),
    };

    if (Object.keys(updateInput).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    let updatedAccount: Account;

    try {
      updatedAccount = await this.accountRepository.updateById(userId, updateInput);
    } catch (error: unknown) {
      if (this.isUsernameUniqueConstraintError(error)) {
        throw new BadRequestException('Username is already in use');
      }

      throw error;
    }

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

  async equipItemByUser(itemId: string, accountId: string): Promise<EquipItemByUserResponse> {
    return this.prisma.$transaction(async (tx) => {
      const account = await this.accountRepository.findByIdInTransaction(accountId, tx);

      if (!account) {
        throw new UnauthorizedException('Account is not found');
      }

      const item = await this.itemRepository.findById(itemId, tx);

      if (!item) {
        throw new NotFoundException('Item is not found');
      }

      if (item.ownerUserId !== accountId) {
        throw new ForbiddenException('Item does not belong to user');
      }

      if (!this.isSupportedEquipmentSlot(item.slotType)) {
        throw new BadRequestException('Item slot type is not supported for equipment');
      }

      await this.userEquipmentRepository.setEquipmentByItemIdForUser(
        itemId,
        item.slotType,
        accountId,
        tx,
      );

      return {
        equipped: await this.getUserEquipmentByUserId(accountId, tx),
      };
    });
  }

  async getUserEquipmentByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<UserEquipmentDto> {
    const account = tx
      ? await this.accountRepository.findByIdInTransaction(userId, tx)
      : await this.accountRepository.findById(userId);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    const equipments = await this.userEquipmentRepository.getEquipmentByUserId(userId, tx);

    return equipments.reduce<UserEquipmentDto>((accumulator, equipment) => {
      if (!equipment.item) {
        return accumulator;
      }

      const equipmentSlot = this.toEquipmentResponseSlot(equipment.slotType);
      accumulator[equipmentSlot] = this.toUserOwnedItem(equipment.item);

      return accumulator;
    }, {});
  }

  private toAuthenticatedUser(account: Account): AuthenticatedUserDto {
    return {
      id: account.id,
      username: account.username,
      avatarUrl: account.avatarUrl ?? null,
      balance: account.balance,
      gameScore: account.gameScore,
      strength: account.strength,
      charisma: account.charisma,
      endurance: account.endurance,
      intelligence: account.intelligence,
      lastTimeLoggedIn: account.lastTimeLoggedIn?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }

  private isUsernameUniqueConstraintError(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    if (error.code !== 'P2002') {
      return false;
    }

    const target = error.meta?.target;

    if (Array.isArray(target)) {
      return target.some(
        (field) => typeof field === 'string' && field.toLowerCase().includes('username'),
      );
    }

    return typeof target === 'string' && target.toLowerCase().includes('username');
  }

  private toUserOwnedItem(item: {
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
    rarity: UserOwnedItemDto['rarity'];
    durability: number | null;
    createdAt: Date;
  }): UserOwnedItemDto {
    return {
      id: item.id,
      name: item.name,
      type: this.toUserItemType(item.slotType),
      slot_type: item.slotType,
      description: item.description,
      image_url: this.toPublicImageUrl(item.imageUrl),
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

  private toPublicImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    return this.configService.get('APP_DOMAIN') + ':' + this.configService.get('PORT') + imageUrl;
  }

  private toUserItemType(slotType: EquipmentSlotType): UserOwnedItemDto['type'] {
    switch (slotType) {
      case EquipmentSlotType.HELMET:
        return 'helmet';
      case EquipmentSlotType.ARMOR:
        return 'chest';
      case EquipmentSlotType.PANTS:
        return 'pants';
      case EquipmentSlotType.BOOTS:
        return 'boots';
      case EquipmentSlotType.LEFT_HAND:
      case EquipmentSlotType.RIGHT_HAND:
        return 'weapon';
      default:
        throw new BadRequestException(`Unsupported slot type: ${slotType}`);
    }
  }

  private toEquipmentResponseSlot(slotType: EquipmentSlotType): keyof UserEquipmentDto {
    switch (slotType) {
      case EquipmentSlotType.HELMET:
        return 'helmet';
      case EquipmentSlotType.ARMOR:
        return 'chest';
      case EquipmentSlotType.PANTS:
        return 'pants';
      case EquipmentSlotType.BOOTS:
        return 'boots';
      case EquipmentSlotType.LEFT_HAND:
        return 'leftWeapon';
      case EquipmentSlotType.RIGHT_HAND:
        return 'rightWeapon';
      default:
        throw new BadRequestException(`Unsupported slot type: ${slotType}`);
    }
  }

  private isSupportedEquipmentSlot(slotType: EquipmentSlotType): boolean {
    return (
      slotType === EquipmentSlotType.HELMET ||
      slotType === EquipmentSlotType.ARMOR ||
      slotType === EquipmentSlotType.PANTS ||
      slotType === EquipmentSlotType.BOOTS ||
      slotType === EquipmentSlotType.LEFT_HAND ||
      slotType === EquipmentSlotType.RIGHT_HAND
    );
  }
}
