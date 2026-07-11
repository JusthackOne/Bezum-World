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
import { EventsResponseDto, GetEventsQueryDto } from './dto';
import { EventsService } from './events.service';
import { EventFilter } from './types/event-filter.type';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get latest game events',
    description: 'Returns newest purchase and battle events with pagination and type filtering.',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'type', required: false, enum: EventFilter })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiOkResponse({ type: EventsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can access events' })
  async getEvents(
    @Query() query: GetEventsQueryDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<EventsResponseDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can access events');
    }

    return this.eventsService.getEvents(query.type ?? EventFilter.all, query.page ?? 1);
  }
}
