import { ApiProperty } from '@nestjs/swagger';

export class TaskSuggestionVoteResponseDto {
  @ApiProperty({
    description: 'Suggestion identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  suggestionId!: string;

  @ApiProperty({
    description: 'Updated vote count',
    example: 4,
  })
  voteCount!: number;

  @ApiProperty({
    description: 'Whether current user has voted',
    example: true,
  })
  hasVoted!: boolean;
}
