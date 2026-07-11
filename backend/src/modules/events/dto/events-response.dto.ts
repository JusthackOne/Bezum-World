import { ApiProperty } from '@nestjs/swagger';

import { EventFilter } from '../types/event-filter.type';

export class EventsPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class EventsResponseDto {
  @ApiProperty({ enum: EventFilter, example: EventFilter.all })
  filter!: EventFilter;

  @ApiProperty({ type: Object, isArray: true })
  events!: unknown[];

  @ApiProperty({ type: EventsPaginationDto })
  pagination!: EventsPaginationDto;
}
