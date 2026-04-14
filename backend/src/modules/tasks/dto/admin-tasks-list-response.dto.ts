import { ApiProperty } from '@nestjs/swagger';

import { TaskResponseDto } from './task-response.dto';

export class AdminTasksListResponseDto {
  @ApiProperty({
    description: 'Tasks list',
    type: TaskResponseDto,
    isArray: true,
  })
  items!: TaskResponseDto[];

  @ApiProperty({
    description: 'Current page (1-based)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total items count',
    example: 53,
  })
  total!: number;

  @ApiProperty({
    description: 'Total pages count',
    example: 3,
  })
  totalPages!: number;
}
