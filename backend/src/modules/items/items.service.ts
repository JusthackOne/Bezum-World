import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Item } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountRepository } from '../auth/repositories';
import { CreateItemDto, CreateItemResponseDto, PurchaseItemResponseDto } from './dto';
import { ItemRepository } from './repositories';
import type { ItemLocation } from './types/item-location.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRepository: ItemRepository,
    private readonly accountRepository: AccountRepository,
    private readonly configService: ConfigService,
  ) {}

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
      slotType: payload.slotType,
      durability: payload.durability ?? null,
    });

    return this.toItemResponse(item);
  }

  async getItems(location?: ItemLocation): Promise<CreateItemResponseDto[]> {
    const items = await this.itemRepository.findAll(location);

    return items.map((item) => this.toItemResponse(item));
  }

  async purchaseByUser(itemId: string, accountId: string): Promise<PurchaseItemResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const account = await this.accountRepository.findByIdInTransaction(accountId, tx);

      if (!account) {
        throw new UnauthorizedException('Account is not found');
      }

      const item = await this.itemRepository.findById(itemId, tx);

      if (!item) {
        throw new NotFoundException('Item is not found');
      }

      if (item.ownerUserId !== null) {
        throw new ConflictException('Item is not available for purchase');
      }

      const wasBalanceUpdated = await this.accountRepository.decrementBalanceIfEnough(
        account.id,
        item.price,
        tx,
      );

      if (!wasBalanceUpdated) {
        throw new BadRequestException('Insufficient balance');
      }

      const wasItemAssigned = await this.itemRepository.assignOwnerIfUnowned(
        item.id,
        account.id,
        tx,
      );

      if (!wasItemAssigned) {
        throw new ConflictException('Item is not available for purchase');
      }

      const [purchasedItem, updatedAccount] = await Promise.all([
        this.itemRepository.findById(item.id, tx),
        this.accountRepository.findByIdInTransaction(account.id, tx),
      ]);

      if (!purchasedItem || !updatedAccount) {
        throw new NotFoundException('Purchase result is not found');
      }

      return {
        item: this.toItemResponse(purchasedItem),
        balance: updatedAccount.balance,
      };
    });
  }

  private toItemResponse(item: Item): CreateItemResponseDto {
    return {
      id: item.id,
      owner_user_id: item.ownerUserId,
      name: item.name,
      description: item.description,
      image_url:
        this.configService.get('APP_DOMAIN') + ':' + this.configService.get('PORT') + item.imageUrl,
      strength: item.strength,
      charisma: item.charisma,
      agility: item.agility,
      intelligence: item.intelligence,
      price: item.price,
      rarity: item.rarity,
      slotType: item.slotType,
      durability: item.durability,
      created_at: item.createdAt.toISOString(),
    };
  }
}
