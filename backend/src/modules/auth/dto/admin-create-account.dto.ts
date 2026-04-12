import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
