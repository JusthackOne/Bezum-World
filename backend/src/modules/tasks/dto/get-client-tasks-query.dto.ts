import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class GetClientTasksQueryDto {
  @ApiPropertyOptional({
    description: 'Search string for task title',
    example: 'workout',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  search?: string;

  @ApiPropertyOptional({
    description: 'Task type filter',
    enum: TaskType,
    example: TaskType.daily,
  })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;
}
