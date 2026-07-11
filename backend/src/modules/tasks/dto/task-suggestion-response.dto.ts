import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType } from '@prisma/client';

import { TaskRewardAttributesDto } from './task-reward-attributes.dto';
import { TaskSuggestionCreatorDto } from './task-suggestion-creator.dto';

export class TaskSuggestionResponseDto {
  @ApiProperty({
    description: 'Suggestion identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  id!: string;

  @ApiProperty({
    description: 'Suggested task type',
    enum: TaskType,
    example: TaskType.daily,
  })
  type!: TaskType;

  @ApiProperty({
    description: 'Suggested task title',
    example: 'Morning workout',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Suggested task description',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Suggested task image URL',
    nullable: true,
  })
  image!: string | null;

  @ApiProperty({
    description: 'Money reward',
    minimum: 0,
  })
  rewardMoney!: number;

  @ApiPropertyOptional({
    description: 'Game score reward',
    nullable: true,
    minimum: 0,
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
  })
  requiresProofImage!: boolean;

  @ApiPropertyOptional({
    description: 'Submission limit for daily tasks',
    nullable: true,
  })
  submissionLimit!: number | null;

  @ApiProperty({
    description: 'Suggestion creator',
    type: TaskSuggestionCreatorDto,
  })
  creator!: TaskSuggestionCreatorDto;

  @ApiProperty({
    description: 'Current vote count',
    example: 3,
  })
  voteCount!: number;

  @ApiProperty({
    description: 'Whether the current user already voted for this suggestion',
    example: false,
  })
  hasVoted!: boolean;

  @ApiProperty({
    description: 'Whether the current user can vote for this suggestion',
    example: true,
  })
  canVote!: boolean;

  @ApiProperty({
    description: 'Suggestion creation timestamp',
    example: '2026-07-11T09:00:00.000Z',
  })
  createdAt!: string;
}
