import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import {
  EquipItemByUserParamsDto,
  EquipItemByUserResponse,
  GetUserEquipmentParamsDto,
  UserEquipmentDto,
} from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('user')
export class UserEquipmentController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('equipment/:itemId')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Equip owned item for authenticated user',
    description: 'Equips an owned item into its corresponding slot and returns current equipment.',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Item identifier to equip',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: EquipItemByUserResponse })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can equip items' })
  @ApiNotFoundResponse({ description: 'Item is not found' })
  async equipItem(
    @Param() params: EquipItemByUserParamsDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<EquipItemByUserResponse> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can equip items');
    }

    return this.usersService.equipItemByUser(params.itemId, request.user.sub);
  }

  @Public()
  @Get(':userId/equipment')
  @ApiOperation({
    summary: 'Get user equipped items by user id',
  })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: UserEquipmentDto })
  @ApiNotFoundResponse({ description: 'User is not found' })
  async getUserEquipment(@Param() params: GetUserEquipmentParamsDto): Promise<UserEquipmentDto> {
    return this.usersService.getUserEquipmentByUserId(params.userId);
  }
}
