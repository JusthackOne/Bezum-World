import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdminCreateAccountDto {
  @ApiProperty({
    description: 'Public username displayed in the game',
    example: 'player_001',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @ApiPropertyOptional({
    description: 'Optional avatar URL',
    example: 'https://cdn.example.com/avatars/player_001.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Initial user account balance',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  balance?: number;

  @ApiPropertyOptional({
    description: 'Initial user game score',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gameScore?: number;

  @ApiProperty({
    description: 'Strength attribute value in range 0..100',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  strength!: number;

  @ApiProperty({
    description: 'Charisma attribute value in range 0..100',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  charisma!: number;

  @ApiProperty({
    description: 'Endurance attribute value in range 0..100',
    example: 40,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  endurance!: number;

  @ApiProperty({
    description: 'Intelligence attribute value in range 0..100',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  intelligence!: number;
}
