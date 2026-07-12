import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import { BossBattlesService } from './boss-battles.service';
import { BossBattleIdParamsDto, BossLeaderboardQueryDto, CreateBossBattleDto, FinishBossBattleDto, UpdateBossBattleDto } from './dto';

@ApiTags('boss-battles') @ApiBearerAuth('access-token') @UseGuards(AccessTokenGuard)
@Controller('boss-battles')
export class BossBattlesController {
  constructor(private readonly service: BossBattlesService) {}
  @Get() @ApiOperation({ summary: 'List boss battles' }) list() { return this.service.list(); }
  @Get('current') @ApiOperation({ summary: 'List active boss battles' }) current() { return this.service.current(); }
  @Get('history') @ApiOperation({ summary: 'List finished boss battles' }) history() { return this.service.list(true); }
  @Get(':id') get(@Param() params: BossBattleIdParamsDto, @Req() request: RequestWithAuthUser) { return this.service.get(params.id, this.userId(request)); }
  @Get(':id/leaderboard') leaderboard(@Param() params: BossBattleIdParamsDto, @Query() query: BossLeaderboardQueryDto, @Req() request: RequestWithAuthUser) { return this.service.leaderboard(params.id, this.userId(request), query.page, query.limit); }
  @Get(':id/me') me(@Param() params: BossBattleIdParamsDto, @Req() request: RequestWithAuthUser) { return this.service.get(params.id, this.userId(request)); }
  @Get(':id/rewards') rewards(@Param() params: BossBattleIdParamsDto, @Req() request: RequestWithAuthUser) { return this.service.get(params.id, this.userId(request)); }
  @Post(':id/attacks') attack(@Param() params: BossBattleIdParamsDto, @Req() request: RequestWithAuthUser) { return this.service.attack(params.id, this.userId(request)); }
  @Post(':id/rewards/claim') claim(@Param() params: BossBattleIdParamsDto, @Req() request: RequestWithAuthUser) { return this.service.claim(params.id, this.userId(request)); }
  private userId(request: RequestWithAuthUser) { if (!request.user?.sub || request.user.actorType !== 'user') throw new ForbiddenException('Only active users can access boss battles'); return request.user.sub; }
}

@ApiTags('admin-boss-battles') @ApiBearerAuth('access-token') @UseGuards(AccessTokenGuard, AdminOnlyGuard)
@Controller('admin/boss-battles')
export class AdminBossBattlesController {
  constructor(private readonly service: BossBattlesService) {}
  @Post() create(@Body() body: CreateBossBattleDto, @Req() request: RequestWithAuthUser) { return this.service.create(this.adminId(request), body); }
  @Get() list() { return this.service.list(); }
  @Get(':id') get(@Param() params: BossBattleIdParamsDto) { return this.service.get(params.id); }
  @Patch(':id') update(@Param() params: BossBattleIdParamsDto, @Body() body: UpdateBossBattleDto, @Req() request: RequestWithAuthUser) { return this.service.update(this.adminId(request), params.id, body); }
  @Post(':id/finish') finish(@Param() params: BossBattleIdParamsDto, @Body() body: FinishBossBattleDto, @Req() request: RequestWithAuthUser) { return this.service.finish(this.adminId(request), params.id, body.grantRewards, body.confirm, body.reason); }
  private adminId(request: RequestWithAuthUser) { if (!request.user?.sub || request.user.actorType !== 'admin') throw new ForbiddenException('Admin access is required'); return request.user.sub; }
}
