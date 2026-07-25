import { Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import { SlotsConfigResponseDto, SpinSlotResponseDto } from './dto';
import { SlotsService } from './slots.service';

@ApiTags('slots')
@ApiBearerAuth('access-token')
@UseGuards(AccessTokenGuard)
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the active slot machine paytable' })
  @ApiOkResponse({ type: SlotsConfigResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can access slots' })
  getConfig(@Req() request: RequestWithAuthUser): SlotsConfigResponseDto {
    this.assertUser(request);
    return this.slotsService.getConfig();
  }

  @Post('spin')
  @ApiOperation({ summary: 'Place one slot spin for the authenticated user' })
  @ApiOkResponse({ type: SpinSlotResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can use slots' })
  @ApiBadRequestResponse({ description: 'Insufficient balance' })
  spin(@Req() request: RequestWithAuthUser): Promise<SpinSlotResponseDto> {
    const accountId = this.assertUser(request);
    return this.slotsService.spin(accountId);
  }

  private assertUser(request: RequestWithAuthUser): string {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can use slots');
    }

    return request.user.sub;
  }
}
