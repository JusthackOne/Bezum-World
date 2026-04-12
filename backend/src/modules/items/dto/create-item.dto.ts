import { ItemRarity } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({
    description: 'Unique item name',
    example: 'Sigma Sword',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @ApiProperty({
    description: 'Item description',
    example: 'A powerful and rare sword',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  description!: string;

  @ApiPropertyOptional({
    description: 'Public image URL',
    example: 'https://example.com/sword.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image_url?: string;

  @ApiPropertyOptional({
    description: 'Strength modifier in range 0..100',
    minimum: 0,
    maximum: 100,
    example: 80,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  strength?: number;

  @ApiPropertyOptional({
    description: 'Charisma modifier in range 0..100',
    minimum: 0,
    maximum: 100,
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  charisma?: number;

  @ApiPropertyOptional({
    description: 'Agility modifier in range 0..100',
    minimum: 0,
    maximum: 100,
    example: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  agility?: number;

  @ApiPropertyOptional({
    description: 'Intelligence modifier in range 0..100',
    minimum: 0,
    maximum: 100,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  intelligence?: number;

  @ApiProperty({
    description: 'Shop price in range 0..1000',
    minimum: 0,
    maximum: 1000,
    example: 500,
  })
  @IsInt()
  @Min(0)
  @Max(1000)
  price!: number;

  @ApiProperty({
    description: 'Item rarity level',
    enum: ItemRarity,
    example: ItemRarity.sigma,
  })
  @IsEnum(ItemRarity)
  rarity!: ItemRarity;

  @ApiPropertyOptional({
    description: 'Durability in range 0..100',
    minimum: 0,
    maximum: 100,
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  durability?: number;
}
