import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateItemDto } from './dto/create-item.dto';
import { CreateItemResponseDto } from './dto/create-item-response.dto';
import { ItemsService } from './items.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';

@ApiTags('items')
@Controller('admin/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
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
}
