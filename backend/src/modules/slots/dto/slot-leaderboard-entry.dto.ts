import { ApiProperty } from '@nestjs/swagger';

export class SlotLeaderboardEntryDto {
  @ApiProperty({ description: 'User identifier' })
  userId!: string;

  @ApiProperty({ description: 'Public username', example: 'heroic_fox' })
  username!: string;

  @ApiProperty({ description: 'User avatar URL', nullable: true })
  avatar!: string | null;

  @ApiProperty({ description: 'Absolute rank for the selected statistic', example: 1 })
  rank!: number;

  @ApiProperty({ description: 'Total net Gold won from winning spins', example: 125 })
  totalWinnings!: number;

  @ApiProperty({ description: 'Total Gold lost from losing spins', example: 45 })
  totalLosses!: number;
}
