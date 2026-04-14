import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GetAdminTasksQueryDto {
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

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
