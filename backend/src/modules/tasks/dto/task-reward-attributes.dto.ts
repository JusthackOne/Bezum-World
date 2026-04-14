import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class TaskRewardAttributesDto {
  @ApiPropertyOptional({
    description: 'Strength reward increment',
    example: 1,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  strength?: number;

  @ApiPropertyOptional({
    description: 'Intelligence reward increment',
    example: 1,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  intelligence?: number;

  @ApiPropertyOptional({
    description: 'Charisma reward increment',
    example: 1,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  charisma?: number;

  @ApiPropertyOptional({
    description: 'Endurance reward increment',
    example: 1,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  endurance?: number;
}
