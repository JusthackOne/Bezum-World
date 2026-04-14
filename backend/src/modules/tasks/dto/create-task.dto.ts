import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TaskType } from '@prisma/client';

import { TaskRewardAttributesDto } from './task-reward-attributes.dto';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task type',
    enum: TaskType,
    example: TaskType.daily,
  })
  @IsEnum(TaskType)
  type!: TaskType;

  @ApiProperty({
    description: 'Task title',
    example: 'Morning workout',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title!: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Run at least 3km and attach screenshot from fitness app.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @ApiPropertyOptional({
    description: 'Task image URL',
    example: 'https://cdn.example.com/tasks/workout.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  @ApiProperty({
    description: 'Money reward',
    example: 150,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rewardMoney!: number;

  @ApiPropertyOptional({
    description: 'Game score reward',
    example: 25,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rewardGameScore?: number;

  @ApiPropertyOptional({
    description: 'Optional attribute rewards',
    type: TaskRewardAttributesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskRewardAttributesDto)
  rewardAttributes?: TaskRewardAttributesDto;

  @ApiProperty({
    description: 'Whether proof image is required on submission',
    example: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  requiresProofImage!: boolean;

  @ApiPropertyOptional({
    description: 'Submission limit (used for daily tasks)',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  submissionLimit?: number;
}
