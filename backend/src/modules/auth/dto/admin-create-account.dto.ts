import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    description: 'Strength attribute value in range 0..100',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
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
  @IsOptional()
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
  @IsOptional()
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
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  intelligence?: number;
}
