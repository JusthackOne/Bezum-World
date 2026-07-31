import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import { CivilizationActionsService } from './civilization-actions.service';
import { CivilizationQueryService } from './civilization-query.service';
import { CivilizationRateLimitGuard } from './civilization-rate-limit.guard';
import {
  AttackCivilizationPlayerDto,
  BuildCivilizationTowerDto,
  CaptureCivilizationBuildingDto,
  CivilizationGameIdParamsDto,
  CivilizationPaginationDto,
  CivilizationTowerActionDto,
  CivilizationTownHallActionDto,
  MoveCivilizationPlayerDto,
} from './dto';

@ApiTags('civilization')
@ApiBearerAuth('access-token')
@Controller('civilization')
@UseGuards(AccessTokenGuard)
export class CivilizationController {
  constructor(
    private readonly queryService: CivilizationQueryService,
    private readonly actionsService: CivilizationActionsService,
  ) {}

  @Get('current')
  async getCurrent(@Req() request: RequestWithAuthUser): Promise<unknown> {
    return this.queryService.getCurrent(this.requireUserId(request));
  }

  @Get('history')
  async getHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: CivilizationPaginationDto,
  ): Promise<unknown> {
    return this.queryService.getHistory(this.requireUserId(request), query.page, query.limit);
  }

  @Get('games/:gameId')
  async getGame(
    @Param() params: CivilizationGameIdParamsDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.queryService.getGameState(params.gameId, this.requireUserId(request));
  }

  @Get('games/:gameId/events')
  async getEvents(
    @Param() params: CivilizationGameIdParamsDto,
    @Query() query: CivilizationPaginationDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.queryService.getEvents(
      params.gameId,
      this.requireUserId(request),
      query.page,
      query.limit,
    );
  }

  @Post('games/:gameId/actions/move')
  @UseGuards(CivilizationRateLimitGuard)
  async move(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: MoveCivilizationPlayerDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.move(params.gameId, this.requireUserId(request), body);
  }

  @Post('games/:gameId/actions/attack-player')
  @UseGuards(CivilizationRateLimitGuard)
  async attackPlayer(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: AttackCivilizationPlayerDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.attackPlayer(params.gameId, this.requireUserId(request), body);
  }

  @Post('games/:gameId/actions/capture-building')
  @UseGuards(CivilizationRateLimitGuard)
  async captureBuilding(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: CaptureCivilizationBuildingDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.captureBuilding(params.gameId, this.requireUserId(request), body);
  }

  @Post('games/:gameId/actions/build-tower')
  @UseGuards(CivilizationRateLimitGuard)
  async buildTower(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: BuildCivilizationTowerDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.buildTower(params.gameId, this.requireUserId(request), body);
  }

  @Post('games/:gameId/actions/attack-tower')
  @UseGuards(CivilizationRateLimitGuard)
  async attackTower(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: CivilizationTowerActionDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.attackTower(params.gameId, this.requireUserId(request), body);
  }

  @Post('games/:gameId/actions/repair-tower')
  @UseGuards(CivilizationRateLimitGuard)
  async repairTower(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: CivilizationTowerActionDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.repairTower(params.gameId, this.requireUserId(request), body);
  }

  @Post('games/:gameId/actions/capture-town-hall')
  @UseGuards(CivilizationRateLimitGuard)
  async captureTownHall(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: CivilizationTownHallActionDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.captureTownHall(params.gameId, this.requireUserId(request), body);
  }

  @Post('games/:gameId/actions/defend-town-hall')
  @UseGuards(CivilizationRateLimitGuard)
  async defendTownHall(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: CivilizationTownHallActionDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.actionsService.defendTownHall(params.gameId, this.requireUserId(request), body);
  }

  private requireUserId(request: RequestWithAuthUser): string {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can access Civilization');
    }

    return request.user.sub;
  }
}
