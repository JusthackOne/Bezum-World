import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import { GetLeaderboardQueryDto, LeaderboardResponseDto } from './dto';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardPeriod } from './types/leaderboard-period.type';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get leaderboard by period',
    description:
      'Returns ranking by total gameScore for all-time or by gained gameScore for weekly/daily periods.',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'period', required: false, enum: LeaderboardPeriod })
  @ApiOkResponse({ type: LeaderboardResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can access leaderboard' })
  async getLeaderboard(
    @Query() query: GetLeaderboardQueryDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<LeaderboardResponseDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can access leaderboard');
    }

    return this.leaderboardService.getLeaderboard(query.period ?? LeaderboardPeriod.all);
  }
}
