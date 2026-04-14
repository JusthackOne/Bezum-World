import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType } from '@prisma/client';

import { TaskRewardAttributesDto } from './task-reward-attributes.dto';

export class TaskResponseDto {
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
    example: 'https://cdn.example.com/tasks/workout.jpg',
  })
  image!: string | null;

  @ApiProperty({
    description: 'Money reward',
    minimum: 0,
    example: 150,
  })
  rewardMoney!: number;

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

  @ApiPropertyOptional({
    description: 'Submission limit (only for daily tasks)',
    nullable: true,
    minimum: 1,
    example: 3,
  })
  submissionLimit!: number | null;

  @ApiProperty({
    description: 'Task creation timestamp',
    example: '2026-04-14T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Task update timestamp',
    example: '2026-04-14T09:30:00.000Z',
  })
  updatedAt!: string;
}
