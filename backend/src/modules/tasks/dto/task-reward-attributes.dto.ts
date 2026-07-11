import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class TaskRewardAttributesDto {
  @ApiPropertyOptional({
    description: 'Strength reward increment',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  strength?: number;

  @ApiPropertyOptional({
    description: 'Intelligence reward increment',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  intelligence?: number;

  @ApiPropertyOptional({
    description: 'Charisma reward increment',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  charisma?: number;

  @ApiPropertyOptional({
    description: 'Endurance reward increment',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  endurance?: number;
}
