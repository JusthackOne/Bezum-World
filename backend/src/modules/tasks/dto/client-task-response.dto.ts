import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType } from '@prisma/client';

import { TaskRewardAttributesDto } from './task-reward-attributes.dto';

export class ClientTaskResponseDto {
  @ApiProperty({
    description: 'Task identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  id!: string;

  @ApiProperty({
    description: 'Task type',
    enum: TaskType,
    example: TaskType.daily,
  })
  type!: TaskType;

  @ApiProperty({
    description: 'Task title',
    example: 'Morning workout',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Task description',
    nullable: true,
    example: 'Run at least 3km and attach screenshot from fitness app.',
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Task image URL',
    nullable: true,
    example: '/uploads/tasks/01-task-image.jpg',
  })
  image!: string | null;

  @ApiPropertyOptional({
    description: 'Money reward',
    minimum: 0,
    nullable: true,
    example: 150,
  })
  rewardMoney!: number | null;

  @ApiPropertyOptional({
    description: 'Game score reward',
    minimum: 0,
    nullable: true,
    example: 25,
  })
  rewardGameScore!: number | null;

  @ApiPropertyOptional({
    description: 'Attribute rewards',
    type: TaskRewardAttributesDto,
    nullable: true,
  })
  rewardAttributes!: TaskRewardAttributesDto | null;

  @ApiProperty({
    description: 'Whether proof image is required',
    example: true,
  })
  requiresProofImage!: boolean;

  @ApiProperty({
    description: 'Whether task is currently available for current user',
    example: true,
  })
  isAvailable!: boolean;
}

export class ClientTasksListResponseDto {
  @ApiProperty({
    type: ClientTaskResponseDto,
    isArray: true,
  })
  items!: ClientTaskResponseDto[];
}
