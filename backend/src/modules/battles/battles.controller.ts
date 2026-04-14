import { Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import {
  BattlePlayersResponseDto,
  StartBattleParamsDto,
  StartBattleResponseDto,
} from './dto';
import { BattlesService } from './battles.service';

@ApiTags('battles')
@Controller('battles')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Get('players')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get battle opponents for current user',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: BattlePlayersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can access battles' })
  async getBattlePlayers(@Req() request: RequestWithAuthUser): Promise<BattlePlayersResponseDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can access battles');
    }

    return this.battlesService.getBattlePlayers(request.user.sub);
  }

  @Post(':opponentUserId')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Start instant battle against opponent',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'opponentUserId',
    description: 'Opponent user id',
    example: '2ad55bcf-4ee2-4a44-86cd-e62052d51a3f',
  })
  @ApiOkResponse({ type: StartBattleResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can start battles' })
  @ApiNotFoundResponse({ description: 'Opponent is not found' })
  @ApiConflictResponse({ description: 'Already battled today' })
  async startBattle(
    @Param() params: StartBattleParamsDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<StartBattleResponseDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can start battles');
    }

    return this.battlesService.startBattle(request.user.sub, params.opponentUserId);
  }
}
