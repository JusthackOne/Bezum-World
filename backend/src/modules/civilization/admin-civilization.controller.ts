import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import { CivilizationAdminService } from './civilization-admin.service';
import { CIVILIZATION_ERROR_CODES, CivilizationException } from './civilization.errors';
import { CivilizationRateLimitGuard } from './civilization-rate-limit.guard';
import {
  AddActiveCivilizationPlayerDto,
  CivilizationAdminListDto,
  CivilizationGameIdParamsDto,
  CivilizationPaginationDto,
  CreateCivilizationGameDto,
  ForceCompleteCivilizationGameDto,
  UpdateCivilizationGameDto,
} from './dto';

@ApiTags('admin-civilization')
@ApiBearerAuth('access-token')
@Controller('admin/civilization')
@UseGuards(AccessTokenGuard, AdminOnlyGuard)
export class AdminCivilizationController {
  constructor(private readonly adminService: CivilizationAdminService) {}

  @Get()
  async list(@Query() query: CivilizationAdminListDto): Promise<unknown> {
    return this.adminService.listGames(query.page, query.limit, query.search, query.status);
  }

  @Post()
  @UseGuards(CivilizationRateLimitGuard)
  async create(
    @Body() body: CreateCivilizationGameDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.adminService.createGame(
      this.requireAdminId(request),
      this.requireIdempotencyKey(idempotencyKey),
      body,
    );
  }

  @Get(':gameId')
  async get(@Param() params: CivilizationGameIdParamsDto): Promise<unknown> {
    return this.adminService.getGame(params.gameId);
  }

  @Patch(':gameId')
  @UseGuards(CivilizationRateLimitGuard)
  async update(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: UpdateCivilizationGameDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.adminService.updateGame(
      params.gameId,
      this.requireAdminId(request),
      this.requireIdempotencyKey(idempotencyKey),
      body,
    );
  }

  @Post(':gameId/players')
  @UseGuards(CivilizationRateLimitGuard)
  async addPlayer(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: AddActiveCivilizationPlayerDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.adminService.addPlayer(
      params.gameId,
      this.requireAdminId(request),
      this.requireIdempotencyKey(idempotencyKey),
      body,
    );
  }

  @Post(':gameId/validate')
  async validate(@Param() params: CivilizationGameIdParamsDto): Promise<unknown> {
    return this.adminService.validateGame(params.gameId);
  }

  @Post(':gameId/schedule')
  @UseGuards(CivilizationRateLimitGuard)
  async schedule(
    @Param() params: CivilizationGameIdParamsDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.adminService.scheduleGame(
      params.gameId,
      this.requireAdminId(request),
      this.requireIdempotencyKey(idempotencyKey),
    );
  }

  @Post(':gameId/cancel')
  @UseGuards(CivilizationRateLimitGuard)
  async cancel(
    @Param() params: CivilizationGameIdParamsDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.adminService.cancelGame(
      params.gameId,
      this.requireAdminId(request),
      this.requireIdempotencyKey(idempotencyKey),
    );
  }

  @Post(':gameId/force-complete')
  @UseGuards(CivilizationRateLimitGuard)
  async forceComplete(
    @Param() params: CivilizationGameIdParamsDto,
    @Body() body: ForceCompleteCivilizationGameDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: RequestWithAuthUser,
  ): Promise<unknown> {
    return this.adminService.forceCompleteGame(
      params.gameId,
      this.requireAdminId(request),
      this.requireIdempotencyKey(idempotencyKey),
      body.winnerTeamId ?? null,
    );
  }

  @Get(':gameId/audit')
  async audit(
    @Param() params: CivilizationGameIdParamsDto,
    @Query() query: CivilizationPaginationDto,
  ): Promise<unknown> {
    return this.adminService.getAuditLog(params.gameId, query.page, query.limit);
  }

  private requireAdminId(request: RequestWithAuthUser): string {
    if (!request.user?.sub) {
      throw new Error('Admin guard did not attach an authenticated actor');
    }

    return request.user.sub;
  }

  private requireIdempotencyKey(value: string | undefined): string {
    if (
      !value ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ) {
      throw new CivilizationException(
        CIVILIZATION_ERROR_CODES.INVALID_IDEMPOTENCY_KEY,
        'Idempotency-Key must be a UUID',
        400,
      );
    }
    return value;
  }
}
