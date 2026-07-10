import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({
    description: 'Public username displayed in the game',
    example: 'player_001',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username?: string;

  @ApiPropertyOptional({
    description: 'Optional avatar URL, nullable to clear',
    example: 'https://cdn.example.com/avatars/player_001.png',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    description: 'User account balance',
    example: 250,
    minimum: 0,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  balance?: number;

  @ApiPropertyOptional({
    description: 'User game score',
    example: 100,
    minimum: 0,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gameScore?: number;

  @ApiPropertyOptional({
    description: 'Strength attribute value in range 0..100',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  strength?: number;

  @ApiPropertyOptional({
    description: 'Charisma attribute value in range 0..100',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  charisma?: number;

  @ApiPropertyOptional({
    description: 'Endurance attribute value in range 0..100',
    example: 40,
    minimum: 0,
    maximum: 100,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  endurance?: number;

  @ApiPropertyOptional({
    description: 'Intelligence attribute value in range 0..100',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  intelligence?: number;
}
