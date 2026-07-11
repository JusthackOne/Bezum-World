import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { EventFilter } from '../types/event-filter.type';

export class GetEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Event type filter',
    enum: EventFilter,
    example: EventFilter.all,
  })
  @IsOptional()
  @IsEnum(EventFilter)
  type?: EventFilter;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page?: number;
}
