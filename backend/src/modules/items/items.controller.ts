import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EquipmentSlotType, ItemRarity } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import { Public } from '../../common/decorators/public.decorator';
import {
  AdminDeleteItemResponseDto,
  CreateItemDto,
  CreateItemResponseDto,
  GetItemsQueryDto,
  PurchaseItemParamsDto,
  PurchaseItemResponseDto,
} from './dto';
import { ItemsService } from './items.service';
import { ITEM_LOCATION_VALUES } from './types/item-location.type';

const ITEM_IMAGES_UPLOAD_DIR = join(process.cwd(), 'uploads', 'items');
const MAX_ITEM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ITEM_IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

interface UploadedItemImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('items')
@Controller()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Public()
  @Get('items')
  @ApiOperation({
    summary: 'Get items with optional location filter',
    description: 'Returns all items or filtered items by location.',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    enum: ITEM_LOCATION_VALUES,
    description: 'shop = owner is null, inventory = owner is not null',
  })
  @ApiOkResponse({ type: CreateItemResponseDto, isArray: true })
  async getItems(@Query() query: GetItemsQueryDto): Promise<CreateItemResponseDto[]> {
    return this.itemsService.getItems(query.location);
  }

  @Post('admin/items')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: MAX_ITEM_IMAGE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    summary: 'Create a unique item (admin only)',
    description: 'Creates a new unique item and puts it into the shop with no owner.',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        image_url: { type: 'string', nullable: true },
        image: { type: 'string', format: 'binary' },
        strength: { type: 'integer', minimum: 0, maximum: 100 },
        charisma: { type: 'integer', minimum: 0, maximum: 100 },
        agility: { type: 'integer', minimum: 0, maximum: 100 },
        intelligence: { type: 'integer', minimum: 0, maximum: 100 },
        price: { type: 'integer', minimum: 0, maximum: 1000 },
        rarity: { type: 'string', enum: Object.values(ItemRarity) },
        slotType: {
          type: 'string',
          enum: Object.values(EquipmentSlotType),
        },
        durability: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['name', 'description', 'price', 'rarity', 'slotType'],
    },
  })
  @ApiCreatedResponse({ type: CreateItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  async createItem(
    @Body() body: CreateItemDto,
    @UploadedFile() imageFile?: UploadedItemImageFile,
  ): Promise<CreateItemResponseDto> {
    const uploadedImageUrl = imageFile ? await this.storeItemImage(imageFile) : undefined;
    const payload: CreateItemDto = {
      ...body,
      ...(uploadedImageUrl ? { image_url: uploadedImageUrl } : {}),
    };

    return this.itemsService.createByAdmin(payload);
  }

  @Patch('admin/items/:itemId')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: MAX_ITEM_IMAGE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    summary: 'Update item by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'itemId',
    description: 'Unique item identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        strength: { type: 'integer', minimum: 0, maximum: 100 },
        charisma: { type: 'integer', minimum: 0, maximum: 100 },
        agility: { type: 'integer', minimum: 0, maximum: 100 },
        intelligence: { type: 'integer', minimum: 0, maximum: 100 },
        price: { type: 'integer', minimum: 0, maximum: 1000 },
        rarity: { type: 'string', enum: Object.values(ItemRarity) },
        slotType: {
          type: 'string',
          enum: Object.values(EquipmentSlotType),
        },
        durability: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['name', 'description', 'price', 'rarity', 'slotType'],
    },
  })
  @ApiOkResponse({ type: CreateItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Item is not found' })
  async updateItemByAdmin(
    @Param() params: PurchaseItemParamsDto,
    @Body() body: CreateItemDto,
    @UploadedFile() imageFile?: UploadedItemImageFile,
  ): Promise<CreateItemResponseDto> {
    const uploadedImageUrl = imageFile ? await this.storeItemImage(imageFile) : undefined;

    return this.itemsService.updateByAdmin(params.itemId, body, uploadedImageUrl);
  }

  @Delete('admin/items/:itemId')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Delete item by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'itemId',
    description: 'Unique item identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: AdminDeleteItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Item is not found' })
  async deleteItemByAdmin(
    @Param() params: PurchaseItemParamsDto,
  ): Promise<AdminDeleteItemResponseDto> {
    return this.itemsService.deleteByAdmin(params.itemId);
  }

  @Post('items/:itemId/purchase')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Purchase item by id',
    description: 'Buys an item from shop by id for authenticated user.',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'itemId',
    description: 'Unique item identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiCreatedResponse({ type: PurchaseItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can purchase items' })
  @ApiNotFoundResponse({ description: 'Item is not found' })
  @ApiConflictResponse({ description: 'Item is not available for purchase' })
  @ApiBadRequestResponse({ description: 'Insufficient balance' })
  async purchaseItem(
    @Param() params: PurchaseItemParamsDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<PurchaseItemResponseDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can purchase items');
    }

    return this.itemsService.purchaseByUser(params.itemId, request.user.sub);
  }

  private async storeItemImage(file: UploadedItemImageFile): Promise<string> {
    const imageExtension =
      ITEM_IMAGE_MIME_TO_EXTENSION[file.mimetype] ?? extname(file.originalname).toLowerCase();

    if (!imageExtension || !Object.values(ITEM_IMAGE_MIME_TO_EXTENSION).includes(imageExtension)) {
      throw new BadRequestException('Item image must be jpeg, png, webp, or gif');
    }

    if (file.size > MAX_ITEM_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Item image file is too large');
    }

    await mkdir(ITEM_IMAGES_UPLOAD_DIR, { recursive: true });
    const fileName = `${randomUUID()}${imageExtension}`;
    await writeFile(join(ITEM_IMAGES_UPLOAD_DIR, fileName), file.buffer);

    return `/uploads/items/${fileName}`;
  }
}
