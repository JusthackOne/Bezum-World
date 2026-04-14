import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthenticatedUserDto {
  @ApiProperty({
    description: 'Account identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  id!: string;

  @ApiProperty({
    description: 'Public username',
    example: 'player_001',
  })
  username!: string;

  @ApiPropertyOptional({
    description: 'Optional avatar URL',
    example: 'https://cdn.example.com/avatars/player_001.png',
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'User account balance',
    example: 0,
    minimum: 0,
  })
  balance!: number;

  @ApiProperty({
    description: 'Total accumulated game score',
    example: 1200,
    minimum: 0,
  })
  gameScore!: number;

  @ApiProperty({
    description: 'Strength attribute value in range 0..100',
    example: 10,
    minimum: 0,
    maximum: 100,
  })
  strength!: number;

  @ApiProperty({
    description: 'Charisma attribute value in range 0..100',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  charisma!: number;

  @ApiProperty({
    description: 'Endurance attribute value in range 0..100',
    example: 40,
    minimum: 0,
    maximum: 100,
  })
  endurance!: number;

  @ApiProperty({
    description: 'Intelligence attribute value in range 0..100',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  intelligence!: number;

  @ApiPropertyOptional({
    description: 'Time of last successful login',
    example: '2026-04-12T15:33:21.412Z',
    nullable: true,
  })
  lastTimeLoggedIn!: string | null;

  @ApiProperty({
    description: 'Account creation time',
    example: '2026-04-12T12:10:00.000Z',
  })
  createdAt!: string;
}
