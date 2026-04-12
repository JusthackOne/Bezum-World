import { Body, Controller, ForbiddenException, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import { CreateItemDto } from './dto/create-item.dto';
import { CreateItemResponseDto } from './dto/create-item-response.dto';
import { PurchaseItemParamsDto } from './dto/purchase-item-params.dto';
import { PurchaseItemResponseDto } from './dto/purchase-item-response.dto';
import { ItemsService } from './items.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';

@ApiTags('items')
@Controller()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post('admin/items')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Create a unique item (admin only)',
    description: 'Creates a new unique item and puts it into the shop with no owner.',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: CreateItemDto })
  @ApiCreatedResponse({ type: CreateItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  async createItem(@Body() body: CreateItemDto): Promise<CreateItemResponseDto> {
    return this.itemsService.createByAdmin(body);
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
}
