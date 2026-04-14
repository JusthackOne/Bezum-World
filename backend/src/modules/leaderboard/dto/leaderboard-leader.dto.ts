import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardLeaderDto {
  @ApiProperty({
    description: 'User identifier',
    example: '15d127e2-1fc1-45ad-bef6-a9ed17ecf4ca',
  })
  userId!: string;

  @ApiProperty({
    description: 'Public username',
    example: 'heroic_fox',
  })
  username!: string;

  @ApiProperty({
    description: 'User avatar url',
    nullable: true,
    example: '/uploads/avatars/avatar.png',
  })
  avatar!: string | null;

  @ApiProperty({
    description: 'Absolute rank in selected leaderboard',
    example: 1,
  })
  rank!: number;

  @ApiProperty({
    description:
      'Score used for sorting. Equals totalGameScore for all-time and periodGameScore for weekly/daily.',
    example: 1320,
  })
  score!: number;

  @ApiProperty({
    description: 'Total user gameScore value',
    example: 1320,
  })
  totalGameScore!: number;

  @ApiProperty({
    description: 'Gained gameScore in selected period. For all-time equals totalGameScore.',
    example: 210,
  })
  periodGameScore!: number;
}

