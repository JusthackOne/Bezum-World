import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Item } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AccountRepository } from '../auth/repositories';
import { EventsService } from '../events/events.service';
import {
  type AdminDeleteItemResponseDto,
  CreateItemDto,
  CreateItemResponseDto,
  ListItemForSaleDto,
  PurchaseItemResponseDto,
} from './dto';
import { ItemRepository, type ItemWithSeller } from './repositories';
import type { ItemLocation } from './types/item-location.type';
import type { ItemSaleSource } from './types/item-sale-source.type';

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRepository: ItemRepository,
    private readonly accountRepository: AccountRepository,
    private readonly eventsService: EventsService,
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

  async getItems(
    location?: ItemLocation,
    saleSource?: ItemSaleSource,
  ): Promise<CreateItemResponseDto[]> {
    const items = await this.itemRepository.findAll(location, saleSource);

    return items.map((item) => this.toItemResponse(item));
  }

  async updateByAdmin(
    itemId: string,
    payload: CreateItemDto,
    imageUrl?: string,
  ): Promise<CreateItemResponseDto> {
    const item = await this.itemRepository.updateById(itemId, {
      name: payload.name,
      description: payload.description ?? null,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      strength: payload.strength ?? null,
      charisma: payload.charisma ?? null,
      agility: payload.agility ?? null,
      intelligence: payload.intelligence ?? null,
      price: payload.price,
      rarity: payload.rarity,
      slotType: payload.slotType,
      durability: payload.durability ?? null,
    });

    if (!item) {
      throw new NotFoundException('Item is not found');
    }

    return this.toItemResponse(item);
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

      const isPlayerListing = item.ownerUserId !== null && item.isListedForSale;
      const purchasePrice = isPlayerListing ? item.listingPrice : item.price;

      if (item.ownerUserId !== null && !isPlayerListing) {
        throw new ConflictException('Item is not available for purchase');
      }

      if (item.ownerUserId === account.id) {
        throw new BadRequestException('You cannot purchase your own listing');
      }

      if (purchasePrice === null) {
        throw new ConflictException('Item listing price is not available');
      }

      const wasBalanceUpdated = await this.accountRepository.decrementBalanceIfEnough(
        account.id,
        purchasePrice,
        tx,
      );

      if (!wasBalanceUpdated) {
        throw new BadRequestException('Insufficient balance');
      }

      const wasItemAssigned = isPlayerListing
        ? await this.itemRepository.transferListedItem(
            item.id,
            item.ownerUserId as string,
            account.id,
            purchasePrice,
            tx,
          )
        : await this.itemRepository.assignOwnerIfUnowned(item.id, account.id, tx);

      if (!wasItemAssigned) {
        throw new ConflictException('Item is not available for purchase');
      }

      if (isPlayerListing && item.ownerUserId) {
        await Promise.all([
          this.itemRepository.clearEquipmentReference(item.id, tx),
          this.accountRepository.incrementBalance(item.ownerUserId, purchasePrice, tx),
        ]);
      }

      const [purchasedItem, updatedAccount] = await Promise.all([
        this.itemRepository.findById(item.id, tx),
        this.accountRepository.findByIdInTransaction(account.id, tx),
      ]);

      if (!purchasedItem || !updatedAccount) {
        throw new NotFoundException('Purchase result is not found');
      }

      await this.eventsService.createPurchaseEvent(
        {
          userId: account.id,
          itemId: purchasedItem.id,
        },
        tx,
      );

      return {
        item: this.toItemResponse(purchasedItem),
        balance: updatedAccount.balance,
      };
    });
  }

  async listForSaleByUser(
    itemId: string,
    accountId: string,
    payload: ListItemForSaleDto,
  ): Promise<CreateItemResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const item = await this.itemRepository.findById(itemId, tx);

      if (!item) {
        throw new NotFoundException('Item is not found');
      }

      if (item.ownerUserId !== accountId) {
        throw new ForbiddenException('Item does not belong to user');
      }

      if (item.isListedForSale) {
        throw new ConflictException('Item is already listed for sale');
      }

      const wasListed = await this.itemRepository.setListingIfOwned(
        item.id,
        accountId,
        false,
        payload.price,
        tx,
      );

      if (!wasListed) {
        throw new ConflictException('Item listing state changed');
      }

      const listedItem = await this.itemRepository.findById(item.id, tx);

      if (!listedItem) {
        throw new NotFoundException('Listed item is not found');
      }

      return this.toItemResponse(listedItem);
    });
  }

  async removeFromSaleByUser(itemId: string, accountId: string): Promise<CreateItemResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const item = await this.itemRepository.findById(itemId, tx);

      if (!item) {
        throw new NotFoundException('Item is not found');
      }

      if (item.ownerUserId !== accountId) {
        throw new ForbiddenException('Item does not belong to user');
      }

      if (!item.isListedForSale) {
        throw new ConflictException('Item is not listed for sale');
      }

      const wasRemoved = await this.itemRepository.setListingIfOwned(
        item.id,
        accountId,
        true,
        null,
        tx,
      );

      if (!wasRemoved) {
        throw new ConflictException('Item listing state changed');
      }

      const updatedItem = await this.itemRepository.findById(item.id, tx);

      if (!updatedItem) {
        throw new NotFoundException('Updated item is not found');
      }

      return this.toItemResponse(updatedItem);
    });
  }

  async deleteByAdmin(itemId: string): Promise<AdminDeleteItemResponseDto> {
    const wasDeleted = await this.itemRepository.deleteById(itemId);

    if (!wasDeleted) {
      throw new NotFoundException('Item is not found');
    }

    return {
      message: 'Item deleted',
      itemId,
    };
  }

  private toItemResponse(item: Item | ItemWithSeller): CreateItemResponseDto {
    const seller = 'owner' in item && item.isListedForSale ? item.owner : null;

    return {
      id: item.id,
      owner_user_id: item.ownerUserId,
      isListedForSale: item.isListedForSale,
      listingPrice: item.listingPrice,
      seller: seller
        ? {
            id: seller.id,
            nickname: seller.username,
            avatarUrl: seller.avatarUrl,
          }
        : null,
      name: item.name,
      description: item.description,
      image_url: item.imageUrl,
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
