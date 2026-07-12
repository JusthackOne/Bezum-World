import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class AdminCreateAccountDto {
  @ApiPropertyOptional({
    description: 'Optional unique 6-character login code; generated automatically when omitted',
    example: 'A1B2C3',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9]{6}$/, {
    message: 'code must contain exactly 6 alphanumeric characters',
  })
  code?: string;

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
    description: 'Strength attribute value',
    example: 10,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  strength!: number;

  @ApiProperty({
    description: 'Charisma attribute value',
    example: 25,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  charisma!: number;

  @ApiProperty({
    description: 'Endurance attribute value',
    example: 40,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  endurance!: number;

  @ApiProperty({
    description: 'Intelligence attribute value',
    example: 30,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  intelligence!: number;
}
